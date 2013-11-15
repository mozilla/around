define ['zepto', 'underscore', 'backbone', 'cs!models/checkin', 'cs!models/venue', 'tpl!templates/checkins/create-from-venues.html.ejs', 'tpl!templates/checkins/insight.html.ejs', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/full-modal.html.ejs'], ($, _, Backbone, Checkin, Venue, CreateFromVenuesTemplate, InsightTemplate, ShowTemplate, FullModalTemplate) ->
  'use strict'

  # View to create a check-in for a user. Pass a user and a venue object in
  # and we create a new check-in.
  CreateView = Backbone.View.extend
    initialize: (venue, user = null) ->
      user = window.GLOBALS.Users.getSelf() unless user

      $.when(user.checkIn(venue)).done (checkin) =>
        # Navigate to the venue page first, then load our insight modal.
        # TODO: This shouldn't be part of state; load it in as a special
        # modal view instead?
        window.router.navigate "/venues/#{checkin.venue.id}",
          replace: true
          trigger: true

        $('#modal').show()
        new InsightModalView(
          _el: '@checkin-insight'
          model: checkin
        )

  InsightModalView = Backbone.View.extend
    model: Checkin
    template: InsightTemplate

    initialize: ->
      $('body').append FullModalTemplate {
        element: @options._el
        fixedContent: ''
        templateHTML: @template
          checkin: @model
      }

      @setElement @options._el

      @render()

    render: ->
      html = @template
        checkin: @model

      $(@$el).html(html)

  # View to create a check-in from a list of venues. This is the view that
  # appears when the user taps the "check in" button at the bottom of the
  # screen.
  ModalFromVenuesView = Backbone.View.extend
    headerLocation: null
    map: null
    position: null
    section: null
    template: CreateFromVenuesTemplate
    user: null
    venues: []

    _cancelMap: false

    events:
      "click option": "changeSectionSearch"
      "click .venue": "checkInToVenue"

    # Get the relevant local venues for this user while we render the template.
    initialize: ->
      _.bindAll this

      window.navigator.geolocation.getCurrentPosition(@_geoSuccess, @_geoError)

      $('body').append FullModalTemplate {
        element: @options._el
        fixedContent: '<div id="map"></div>'
        templateHTML: "<div id=\"#{@options._el.replace '#', ''}\">#{@template(@_templateData())}</div>"
      }

      @setElement @options._el

    render: ->
      html = @template(@_templateData())

      @$el.html(html)

      if @position and @venues.length
        # Create bounds for the map to focus on.
        bounds = new L.Bounds()

        # Add the top five venues to the map.
        _.first(@venues, 4).forEach (v) =>
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
      @section = event.currentTarget.value
      @venues = []
      @getVenues()
      @render()

    checkInToVenue: (event) ->
      window.app.destroyFullModal()

      window.router.navigate "checkins/create/#{$(event.currentTarget).data('venue')}",
        replace: false
        trigger: true

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

        @render()
      .fail ->
        window.alert "Error getting venues!"

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

    _geoSuccess: (position) ->
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
    Create: CreateView
    InsightModal: InsightModalView
    ModalFromVenues: ModalFromVenuesView
  }
