define ['zepto', 'underscore', 'backbone', 'cs!geo', 'cs!models/venue', 'cs!views/checkins', 'tpl!templates/venues/list.html.ejs', 'tpl!templates/venues/show.html.ejs'], ($, _, Backbone, Geo, Venue, CheckinViews, ListTemplate, ShowTemplate) ->
  'use strict'

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

  # Venue view; used to show a venue in various places, with information
  # obscured via CSS.
  ShowView = Backbone.View.extend
    model: Venue
    template: ShowTemplate

    tips: []

    events:
      'click .check-in': 'checkIn'

    mapURL: null

    initialize: ->
      window.GLOBALS.Venues.get(@id).done (venue) =>
        @model = venue

        @mapURL = Geo.staticMap([venue.location.lat, venue.location.lng], [[venue.location.lat, venue.location.lng]], 16, [$(window).width(), 125])

        @render()

        venue.tips().done (tips) =>
          @tips = _.first(tips, 5)
          @render()
      .fail =>
        @render()

    render: ->
      html = @template
        mapURL: @mapURL
        tips: @tips
        venue: @model
      $(@$el).html(html)

    checkIn: ->
      new CheckinViews.ConfirmModal({
        model: @model
      })

  return {
    List: ListView
    Show: ShowView
  }
