define ['zepto', 'underscore', 'backbone', 'cs!geo', 'cs!models/checkin', 'cs!models/venue', 'cs!views/modal', 'tpl!templates/checkins/confirm.html.ejs', 'tpl!templates/checkins/create-from-venues.html.ejs', 'tpl!templates/checkins/insight.html.ejs', 'tpl!templates/checkins/show.html.ejs'], ($, _, Backbone, Geo, Checkin, Venue, ModalView, ConfirmTemplate, CreateFromVenuesTemplate, InsightTemplate, ShowTemplate) ->
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
    fixedContent: '<div id="map"></div>'
    headerLocation: null
    isFullModal: true
    map: null
    position: null
    section: null
    template: CreateFromVenuesTemplate
    user: null
    venues: []

    _cancelMap: false

    events:
      "change select": "changeSectionSearch"
      "click .venue": "showCheckinOptions"
      "longTap .venue": "checkInToVenue"

    # Get the relevant local venues for this user while we render the template.
    _initialize: ->
      Geo.getCurrentPosition().done(@_geoSuccess).fail(@_geoError)

    _render: ->
      if @position and @venues.length
        # Create bounds for the map to focus on.
        bounds = new L.Bounds()

        # Add the top five venues to the map.
        _.first(@venues, 5).forEach (v) =>
          L.marker([v.location.lat, v.location.lng]).addTo(@map)
          bounds.extend [v.location.lat, v.location.lng]

        latLngBounds = new L.LatLngBounds([
          [bounds.min.x, bounds.min.y],
          [bounds.max.x, bounds.max.y]
        ])
        @map.fitBounds(latLngBounds, {
          padding: [25, 25]
        })

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

        if @venues.length
          @render()
        else
          console.info "Nothing available for #{@section}; searching for everything instead."
          @section = null
          @getVenues()
      .fail ->
        window.alert "Error getting venues!"

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
        headerLocation: @headerLocation
        sectionEnabled: @section
        sections: Venue.SECTIONS
        position: @position
        venues: @venues
      }

  ShowView = Backbone.View.extend
    template: ShowTemplate

  return {
    ConfirmModal: ConfirmView
    Create: CreateView
    InsightModal: InsightModalView
    ModalFromVenues: ModalFromVenuesView
  }
