define ['zepto', 'underscore', 'backbone', 'cs!geo', 'cs!views/checkins', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/timeline/show.html.ejs'], ($, _, Backbone, Geo, CheckinViews, CheckinShowTemplate, TimelineShowTemplate) ->
  'use strict'

  ShowView = Backbone.View.extend
    el: "#content"
    $el: $("#content")
    modal: false
    template: TimelineShowTemplate

    checkins: null

    events:
      'click .check-in': 'showCheckinModal'

    initialize: ->
      _.bindAll this

      window.GLOBALS.Checkins.recent().done @loadCheckins

      @render()

    render: ->
      html = @template
        checkins: @checkins
        CheckinShowTemplate: CheckinShowTemplate
        nearbyCheckins: @nearbyCheckins

      @$el.html(html)

    destroyCheckinModal: ->
      @checkinView.remove()
      delete @checkinView
      window.app.off 'destroy:modal', @destroyCheckinModal

    loadCheckins: (checkins) ->
      @checkins = checkins

      Geo.filterNearby(checkins).done (nearby) =>
        @nearbyCheckins = nearby
        @render()

      @render()

    showCheckinModal: ->
      # HACK: No idea why, but this listener gets repeated or some such
      # nonsense, so we prevent it from displaying more than one modal.
      return if $('#full-modal').length

      @checkinView = new CheckinViews.ModalFromVenues
        _el: '#venues'

      window.app.on 'destroy:modal', @destroyCheckinModal

  return {
    Show: ShowView
  }
