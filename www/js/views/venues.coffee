define ['zepto', 'underscore', 'backbone', 'cs!collections/venues', 'cs!models/venue', 'tpl!templates/venues/list.html.ejs', 'tpl!templates/venues/show.html.ejs'], ($, _, Backbone, Venues, Venue, ListTemplate, ShowTemplate) ->
  'use strict'

  # List of venue views, most often used when searching for a venue, using
  # explore, or tapping the persistent check-in button in the bottom of the app.
  ListView = Backbone.View.extend
    model: Venue
    models: null
    template: ListTemplate

    initialize: ->
      self = this

      Venues.get @ids,
        success: (venues) ->
          self.models = venues
          self.render()
        error: (response) ->
          self.render()

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
      self = this

      Venues.get @id,
        success: (venue) ->
          self.model = venue
          self.render()
        error: (response) ->
          self.model = null
          self.render()

    render: ->
      html = @template
        venue: @model
      $(@$el).html(html)

  return {
    List: ListView
    Show: ShowView
  }
