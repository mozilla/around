define ['zepto', 'underscore', 'backbone', 'cs!lib/api', 'cs!lib/geo', 'localforage', 'cs!models/tip', 'cs!models/venue', 'cs!views/checkins', 'cs!views/modal', 'tpl!templates/venues/create-tip.html.ejs', 'tpl!templates/venues/explore.html.ejs', 'tpl!templates/venues/list.html.ejs', 'tpl!templates/venues/show.html.ejs', 'tpl!templates/venues/show-list-item.html.ejs', 'tpl!templates/venues/tips.html.ejs'], ($, _, Backbone, API, Geo, localForage, Tip, Venue, CheckinViews, ModalView, CreateTipTemplate, ExploreTemplate, ListTemplate, ShowTemplate, ShowListItemTemplate, TipsTemplate) ->
  'use strict'

  # Modal view to add a tip to a venue.
  CreateTip = ModalView.extend
    _el: '#create-tip'
    model: Venue
    template: CreateTipTemplate

    _isPosting: false

    events:
      "click .accept": "addTip"
      "click .cancel": "dismiss"

    addTip: ->
      return if @_isPosting

      @_isPosting = true

      API.request "tips/add",
        data:
          text: $('#tip-text').val()
          venueId: $('#tip-text').data('venue')
        requestMethod: "POST"
      .done (data) =>
        tipModel = new Tip(data.response.tip)
        tipModel.lastUpdated = window.timestamp()
        tipModel._venueID = $('#tip-text').data('venue')

        window.GLOBALS.Tips.add(tipModel)
        tipModel.save()

        @dismiss()

    _templateData: ->
      {
        venue: @model
      }

  # List of venue views, most often used when searching for a venue, using
  # explore, or tapping the persistent check-in button in the bottom of the app.
  ListView = Backbone.View.extend
    model: Venue
    models: null
    template: ListTemplate

    initialize: ->
      window.GLOBALS.Venues.where(@ids).done (venues) =>
        @models = venues
        @render()
      .fail =>
        @render()

    render: ->
      html = @template
        venues: @models
      $(@$el).html(html)

  # Explore view; see venues nearby without committing to a checkin.
  # Essentially: browse.
  ExploreView = Backbone.View.extend
    el: '.explore'
    $el: $('.explore')
    template: ExploreTemplate

    fixedContent: '
      <div id="map" class="map"></div>
      <div class="explore"></div>
    '

    headerLocation: null
    isFullModal: true
    map: null
    position: null
    searchResult: null
    section: null
    user: null
    venueSearchValue: ''
    venues: []
    venueMarkers: []

    events:
      "change .explore select": "changeSectionSearch"

    initialize: ->
      _.bindAll this

      $('#content').html @fixedContent
      @setElement '.explore'

      @section = @options.section

      @render()

      # Get the relevant local venues for this user while we render the template.
      Geo.getCurrentPosition().done(@_geoSuccess).fail(@_geoError)

    render: ->
      @$el.html @template(
        headerLocation: @headerLocation
        sectionEnabled: @section
        sections: Venue.SECTIONS
        position: @position
        VenueShowListItemTemplate: ShowListItemTemplate
        venues: @venues
      )

      $('x-appbar header').text @headerLocation

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

    changeSectionSearch: (event) ->
      @section = $(event.target).children('option')[event.target.selectedIndex].value

      window.router.navigate "explore#{if @section then '/' else ''}#{@section}",
        replace: true
        trigger: false

      @venues = []
      @getVenues()
      @render()

    getVenues: ->
      return unless @position

      section = @section

      localForage.getItem "explore-#{section}", (data) =>
        if data and data.timestamp + (window.GLOBALS.MINUTE * 2) > window.timestamp()
          @headerLocation = data.headerLocation
          @venues = _.map JSON.parse(data.venues), (v) ->
            new Venue(v)

          return @render()

        window.GLOBALS.Venues.near({
          ll: "#{@position.coords.latitude},#{@position.coords.longitude}"
          accuracy: @position.coords.accuracy
        }, section).done (venues, data) =>
          @venues = venues

          @headerLocation = data.response.headerFullLocation

          if @venues.length
            # Store these venues for a brief period of time for fast reloading of
            # data between views.
            localForage.setItem "explore-#{section}",
              headerLocation: @headerLocation
              timestamp: window.timestamp()
              venues: JSON.stringify(@venues)

            @render()
          else
            console.info "Nothing available for #{@section}; searching for everything instead."
            @section = null
            @getVenues()
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

  # Venue view; used to show a venue in various places, with information
  # obscured via CSS.
  ShowView = Backbone.View.extend
    el: '#content'
    $el: $('#content')
    model: Venue
    template: ShowTemplate

    hours: null
    isLoading: true
    isLocal: true
    tips: []

    events:
      # Check in; that's important!
      'click .venue-summary .check-in': 'checkIn'

      'click .photos.venue .photo': 'showPhoto'

      # Leave feedback via likes, dislikes, and tips.
      'click .venue-summary .like': 'like'
      'click .more-tips .leave-tip': 'leaveTip'
      'click .venue-summary .dislike': 'dislike'

      'click .upload-photo': 'activateUpload'
      'change #upload-photo': 'uploadPhoto'

    mapURL: null

    initialize: ->
      _.bindAll this

      @render()

      window.GLOBALS.Venues.get(@id).done (venue) =>
        @isLoading = false
        @model = venue

        @model.on 'change', @render

        @mapURL = Geo.staticMap([venue.location.lat, venue.location.lng], [[venue.location.lat, venue.location.lng]], 16, [$(window).width(), 125])

        @render()

        Geo.isNearby(venue.location.lat, venue.location.lng).done (isLocal) =>
          @isLocal = isLocal

          # Don't bother re-rendered this view if the value hasn't changed from
          # its default.
          @render() unless @isLocal

        venue.tips().done (tips) =>
          return unless $("#venue-#{@model.id}").length
          @tips = tips
          @render()
      .fail =>
        @render()

    render: ->
      html = @template
        hours: @hours
        isLoading: @isLoading
        isLocal: @isLocal
        mapURL: @mapURL
        tips: @tips
        venue: @model
      $(@$el).html(html)

    activateUpload: () ->
      $('#upload-photo').trigger 'click'

    checkIn: (event) ->
      # TODO: See why this is fired for old venue code... maybe it's not
      # getting removed properly?
      return unless $(event.target).data('venue') is @model.id

      new CheckinViews.ConfirmModal({
        model: @model
      })

    # Change whether or not the user dislikes this venue.
    dislike: (event) ->
      return unless $(event.target).data('venue') is @model.id

      event.target.disabled = true

      @model.changeDislike($(event.target).data('action'))

    leaveTip: (event) ->
      # TODO: See why this is fired for old venue code... maybe it's not
      # getting removed properly?
      return unless $(event.target).data('venue') is @model.id

      new CreateTip({
        model: @model
      })

    # Change whether or not the user likes this venue.
    like: (event) ->
      return unless $(event.target).data('venue') is @model.id

      event.target.disabled = true

      @model.changeLike($(event.target).data('action'))

    # Opens the photo in a browser if on Firefox OS; otherwise just passes
    # the event off and lets the user's browser open it in a new tab/window.
    showPhoto: (event) ->
      if window.MozActivity
        event.preventDefault()

        openURL = new MozActivity
          name: "view"
          data:
            type: "url"
            url: $(event.target).attr "href"

    # Upload a photo to Foursquare for this venue.
    uploadPhoto: (event) ->
      return unless $(event.target).data('venue') is @model.id

      # Check for existance of file.
      return unless event.target.files.length

      @model.addPhoto(event.target.files[0]).done(@render).fail(window.alert)

  # Tips view; show all the tips for this venue.
  TipsView = Backbone.View.extend
    el: '#content'
    $el: $('#content')
    model: Venue
    template: TipsTemplate

    isLoading: true
    tips: []

    initialize: ->
      _.bindAll this

      @render()

      window.GLOBALS.Venues.get(@id).done (venue) =>
        @isLoading = false
        @model = venue

        @render()

        venue.tips().done (tips) =>
          return unless $("#venue-#{@model.id}").length
          @tips = tips
          @render()
      .fail =>
        @render()

    render: ->
      html = @template
        isLoading: @isLoading
        tips: @tips
        venue: @model
      $(@$el).html(html)

  return {
    Explore: ExploreView
    List: ListView
    Show: ShowView
    Tips: TipsView
  }
