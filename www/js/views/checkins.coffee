define ['zepto', 'underscore', 'backbone', 'cs!api', 'cs!geo', 'cs!models/checkin', 'cs!models/venue', 'cs!views/modal', 'tpl!templates/checkins/confirm.html.ejs', 'tpl!templates/checkins/create-from-venues.html.ejs', 'tpl!templates/checkins/header.html.ejs', 'tpl!templates/checkins/insight.html.ejs', 'tpl!templates/checkins/show.html.ejs'], ($, _, Backbone, API, Geo, Checkin, Venue, ModalView, ConfirmTemplate, CreateFromVenuesTemplate, HeaderTemplate, InsightTemplate, ShowTemplate) ->
  'use strict'

  # Confirmation view/modal; displayed whenever a user taps on a "check in"
  # button to confirm their intent to checkin to this venue.
  ConfirmView = ModalView.extend
    _el: '#confirm-checkin'
    model: Venue
    template: ConfirmTemplate

    events:
      "click .accept": "checkInToVenue"
      "click .cancel": "dismiss"

    checkInToVenue: ->
      window.app.destroyFullModal()

      new CreateView
        shout: $('#checkin-comment').val()
        venueID: @model.id

      @dismiss()

    _templateData: ->
      {
        venue: @model
      }

  # View to create a check-in for a user. Pass a user and a venue object in
  # and we create a new check-in.
  CreateView = Backbone.View.extend
    initialize: ->
      user = window.GLOBALS.Users.getSelf() unless user

      $.when(user.checkIn(@options.venueID, @options.shout)).done (checkin) =>
        # Navigate to the venue page first, then load our insight modal.
        # TODO: This shouldn't be part of state; load it in as a special
        # modal view instead?
        window.router.navigate "/venues/#{checkin.venue.id}",
          replace: true
          trigger: true

        new InsightModalView(
          _el: '#checkin-insight'
          model: checkin
        )

  InsightModalView = ModalView.extend
    model: Checkin
    template: InsightTemplate

    _templateData: ->
      {
        checkin: @model
      }

  # View to create a check-in from a list of venues. This is the view that
  # appears when the user taps the "check in" button at the bottom of the
  # screen.
  ModalFromVenuesView = ModalView.extend
    explore: false
    fixedContent: '<div id="map"></div>'
    headerLocation: null
    isFullModal: true
    map: null
    position: null
    searchResult: null
    section: null
    template: CreateFromVenuesTemplate
    user: null
    venueSearchValue: ''
    venues: []
    venueMarkers: []

    _cancelMap: false
    _originalVenues: []
    _skipResetCheck: false

    events:
      "click .venue": "showCheckinOptions"
      "longTap .venue": "checkInToVenue"

    # Get the relevant local venues for this user while we render the template.
    _initialize: ->
      Geo.getCurrentPosition().done(@_geoSuccess).fail(@_geoError)

    _render: ->
      unless $('.modal .area-container').length
        $('#modal-content').before HeaderTemplate(@_templateData())

      # These event handlers are added here as they are outside the usually
      # re-rendered part of the view's template.
      $('.modal .area-container select').on 'change', @changeSectionSearch
      $('.modal .area-container .venue-search').on 'reset', @resetSearch
      $('.modal .area-container #venue-search').on 'blur', @blurSearch
      $('.modal .area-container #venue-search').on 'focus', @focusSearch
      $('.modal .area-container #venue-search').on 'input', @checkSearchInputLength
      $('.modal .area-container #venue-search').on 'input', @searchForVenue

      @checkSearchInputLength()

      if @position and @venues and @venues.length
        # Create bounds for the map to focus on.
        bounds = new L.Bounds()

        # Remove old markers first
        @venueMarkers.forEach (marker) =>
          @map.removeLayer(marker)

        # Add the top five venues to the map.
        _.first(@venues, 5).forEach (v) =>
          marker = L.marker([v.location.lat, v.location.lng])

          marker.addTo(@map)
          @venueMarkers.push(marker)

          bounds.extend [v.location.lat, v.location.lng]

        latLngBounds = new L.LatLngBounds([
          [bounds.min.x, bounds.min.y],
          [bounds.max.x, bounds.max.y]
        ])
        @map.fitBounds(latLngBounds, {
          padding: [25, 25]
        })

    blurSearch: ->
      $('#map').removeClass('hide-on-mobile')

    changeSectionSearch: (event) ->
      @section = $(event.target).children('option')[event.target.selectedIndex].value
      @venues = []
      @getVenues()
      @render()

    checkInToVenue: (event) ->
      window.app.destroyFullModal()

      new CreateView(
        venueID: $(event.currentTarget).data('venue')
      )

    checkSearchInputLength: (event) ->
      if @_skipResetCheck
        @_skipResetCheck = false
        return

      $input = if event then $(event.target) else $('#venue-search')

      return unless $input.length

      if $input.val().length
        $('.venue-search button[type=reset]').addClass('visible')
      else
        @resetSearch()

    focusSearch: ->
      $('#map').addClass('hide-on-mobile')

    getVenues: ->
      return unless @position

      window.GLOBALS.Venues.near({
        ll: "#{@position.coords.latitude},#{@position.coords.longitude}"
        accuracy: @position.coords.accuracy
      }, @section).done (apiResponse) =>
        @venues = []
        response = apiResponse.response
        _(response.groups[0].items).each (item) =>
          @venues.push item.venue

        @headerLocation = response.headerFullLocation

        $areaContainer = $('.modal .area-container')
        if $areaContainer.length
          $areaContainer.replaceWith(HeaderTemplate(@_templateData()))

        if @venues.length
          @_originalVenues = @venues
          @render()
        else
          console.info "Nothing available for #{@section}; searching for everything instead."
          @section = null
          @getVenues()
      .fail ->
        window.alert "Error getting venues!"

    loadOldVenues: ->
      if @_originalVenues.length
        @venues = @_originalVenues
        @_skipResetCheck = true
        @render()

    resetSearch: ->
      $('#venue-search').val('')
      $('.venue-search button[type=reset]').removeClass('visible')
      @_skipResetCheck = true
      @checkSearchInputLength()
      @loadOldVenues()

    searchForVenue: (event) ->
      searchQuery = $("#venue-search").val()

      return unless searchQuery.length

      # Make sure, if this is an autocomplete search request, we have at least
      # two characters to search for.
      if event and $(event.target).attr('id') == 'venue-search'
        return unless searchQuery.length >= window.GLOBALS.CHARACTERS_FOR_AUTOCOMPLETE

      if @searchRequest
        @searchRequest.abort()

      @searchRequest = API.request "venues/search",
        data:
          intent: 'checkin'
          ll: "#{@position.coords.latitude},#{@position.coords.longitude}"
          query: searchQuery
      .done (data) =>
        @searchRequest = null
        if data.response.venues and data.response.venues.length
          @venues = []
          _(data.response.venues).each (venue) =>
            @venues.push venue
        else
          @venues = null

        @render()

    showCheckinOptions: (event) ->
      window.GLOBALS.Venues.get($(event.currentTarget).data('venue')).done (venue) ->
        new ConfirmView({
          model: venue
        })

    showMap: ->
      @map = L.mapbox.map('map', window.GLOBALS.MAP_ID, {
        zoomControl: false
      }).setView([@position.coords.latitude, @position.coords.longitude], 14)

      # Disable drag and zoom handlers
      @map.dragging.disable()
      @map.touchZoom.disable()
      @map.doubleClickZoom.disable()
      @map.scrollWheelZoom.disable()
      # Disable tap handler, if present.
      @map.tap.disable() if @map.tap

    _geoSuccess: (position, coords, accuracy) ->
      @position = position

      @showMap()

      @getVenues()

      @render()

    _geoError: ->
      return

    _cleanUpMap: ->
      @_cancelMap = true
      @map.remove()

    _templateData: ->
      {
        explore: @explore
        headerLocation: @headerLocation
        sectionEnabled: @section
        sections: Venue.SECTIONS
        position: @position
        venues: @venues
        venueSearchValue: $('#venue-search').val()
      }

  ShowView = Backbone.View.extend
    template: ShowTemplate

  return {
    ConfirmModal: ConfirmView
    Create: CreateView
    InsightModal: InsightModalView
    ModalFromVenues: ModalFromVenuesView
  }
