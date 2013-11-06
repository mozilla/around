define ['zepto', 'underscore', 'backbone', 'cs!collections/checkins', 'cs!collections/users', 'cs!collections/venues', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/timeline/show.html.ejs'], ($, _, Backbone, Checkins, Users, Venues, CheckinShowTemplate, TimelineShowTemplate) ->
  'use strict'

  ShowView = Backbone.View.extend
    el: "#content"
    $el: $("#content")
    template: TimelineShowTemplate

    checkins: null

    events: {

    }

    initialize: ->
      _(this).bindAll 'render', 'loadCheckins'

      Checkins.recent
        success: @loadCheckins

      @render()

    render: ->
      html = @template
        checkins: @checkins
        CheckinShowTemplate: CheckinShowTemplate

      @$el.html(html)

    loadCheckins: (checkins) ->
      @checkins = checkins

      # Add any users or venues not in our data store.
      for c in @checkins
        Users.get c.get('user').id,
          success: (user) ->
            Users.create(user).save()
        Venues.get c.get('venue').id,
          success: (venue) ->
            Venues.create(venue).save()

      @render()

  return {
    Show: ShowView
  }
