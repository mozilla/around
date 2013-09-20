define ['zepto', 'underscore', 'backbone', 'cs!collections/venues', 'cs!models/venue', 'tpl!templates/venues/show.html.ejs'], ($, _, Backbone, Venues, Venue, ShowTemplate) ->
  'use strict'

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
    Show: ShowView
  }
