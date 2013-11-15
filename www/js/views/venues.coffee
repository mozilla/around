define ['zepto', 'underscore', 'backbone', 'cs!models/venue', 'tpl!templates/venues/list.html.ejs', 'tpl!templates/venues/show.html.ejs'], ($, _, Backbone, Venue, ListTemplate, ShowTemplate) ->
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

    initialize: ->
      window.GLOBALS.Venues.get(@id).done (venue) =>
        console.log venue
        @model = venue
        @render()
      .fail =>
        @render()

    render: ->
      html = @template
        venue: @model
      $(@$el).html(html)

  return {
    List: ListView
    Show: ShowView
  }
