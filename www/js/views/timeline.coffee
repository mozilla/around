define ['zepto', 'underscore', 'backbone', 'cs!collections/checkins', 'cs!collections/users', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/timeline/show.html.ejs'], ($, _, Backbone, Checkins, Users, CheckinShowTemplate, TimelineShowTemplate) ->
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
      console.log 'renderCall', @checkins
      html = @template
        checkins: @checkins
        CheckinShowTemplate: CheckinShowTemplate

      @$el.html(html)

    loadCheckins: (checkins) ->
      @checkins = checkins
      @render()

  return {
    Show: ShowView
  }
