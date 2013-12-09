define ['zepto', 'underscore', 'backbone', 'cs!lib/api', 'cs!lib/geo', 'cs!models/checkin', 'cs!models/venue', 'cs!views/modal', 'tpl!templates/checkins/confirm.html.ejs', 'tpl!templates/checkins/create-from-venues.html.ejs', 'tpl!templates/checkins/header.html.ejs', 'tpl!templates/checkins/insight.html.ejs', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/venues/show-list-item.html.ejs'], ($, _, Backbone, API, Geo, Checkin, Venue, ModalView, ConfirmTemplate, CreateFromVenuesTemplate, HeaderTemplate, InsightTemplate, ShowTemplate, VenueShowListItemTemplate) ->
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

      user.checkIn(@options.venueID, @options.shout).done (checkin) =>
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
    _preventModal: false
    _skipResetCheck: false

    events:
      "longTap .venue .arrow": "goToVenue"
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
      setTimeout ->
        $('#map').removeClass('hide-on-mobile')
      , 300

    changeSectionSearch: (event) ->
      @section = $(event.target).children('option')[event.target.selectedIndex].value
      @venues = []
      @getVenues()
      @render()

    checkInToVenue: (event) ->
      return if @_preventModal
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
      }, @section).done (venues) =>
        @venues = venues

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

    goToVenue: (event) ->
      @_preventModal = true
      event.stopPropagation()

      window.app.destroyFullModal()

      window.router.navigate "venues/#{$(event.currentTarget).data('venue')}",
        replace: false
        trigger: true

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

      # Abort the previous search request as we've got more characters.
      if @searchRequest
        @searchRequest._request.abort()

      @searchRequest = window.GLOBALS.Venues.search
        intent: 'checkin'
        ll: "#{@position.coords.latitude},#{@position.coords.longitude}"
        query: searchQuery
      .done (venues) =>
        @venues = venues
        @searchRequest = null

        @_getPhotosForVenues(@venues)

        @render()

    showCheckinOptions: (event) ->
      return if @_preventModal
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

    _cleanUpMap: ->
      @_cancelMap = true
      @map.remove()

    _geoSuccess: (position, coords, accuracy) ->
      @position = position

      @showMap()

      @getVenues()

      @render()

    _geoError: ->
      return

    # Slightly expensive way to get all the photos for some venues in the
    # "Explore" view. We don't get every single venue's photos, as it requires
    # a few extra HTTP requests per-venue (one for the full venue data and
    # then the image file itself).
    #
    # TODO: Use Foursquare's "multi request API":
    # https://developer.foursquare.com/docs/multi/multi
    _getPhotosForVenues: (venues) ->
      _.first(venues, window.GLOBALS.SEARCH_NUMBER_VENUES_WITH_PHOTO).forEach (v) =>
        v.getPhotos().done(@render) unless v.photos

    _templateData: ->
      {
        headerLocation: @headerLocation
        sectionEnabled: @section
        sections: Venue.SECTIONS
        position: @position
        VenueShowListItemTemplate: VenueShowListItemTemplate
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
