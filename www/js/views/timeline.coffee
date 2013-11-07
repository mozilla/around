define ['zepto', 'underscore', 'backbone', 'cs!collections/checkins', 'cs!collections/users', 'cs!collections/venues', 'cs!views/checkins', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/timeline/show.html.ejs'], ($, _, Backbone, Checkins, Users, Venues, CheckinViews, CheckinShowTemplate, TimelineShowTemplate) ->
  'use strict'

  ShowView = Backbone.View.extend
    el: "#content"
    $el: $("#content")
    modal: false
    template: TimelineShowTemplate

    checkins: null

    events:
      'click #check-in': 'showCheckinModal'

    initialize: ->
      _.bindAll this

      Checkins.recent
        success: @loadCheckins

      @render()

    render: ->
      html = @template
        checkins: @checkins
        CheckinShowTemplate: CheckinShowTemplate

      @$el.html(html)

    destroyCheckinModal: ->
      @checkinView.remove()
      delete @checkinView
      window.app.off 'destroy:modal', @destroyCheckinModal

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
