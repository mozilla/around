define ['zepto', 'underscore', 'backbone', 'cs!geo', 'cs!views/checkins', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/timeline/show.html.ejs'], ($, _, Backbone, Geo, CheckinViews, CheckinShowTemplate, TimelineShowTemplate) ->
  'use strict'

  ShowView = Backbone.View.extend
    el: "#content"
    $el: $("#content")
    modal: false
    template: TimelineShowTemplate

    checkins: null
    mapURL: null
    nearbyCheckins: null

    events:
      'click .check-in': 'showCheckinModal'
      # HACK: This should work in brick, but currently doesn't.
      'click x-tabbar-tab': 'toggleTabs'

    initialize: ->
      _.bindAll this

      @user = window.GLOBALS.Users.getSelf()

      Geo.getCurrentPosition().done (position, latLng) =>
        @mapURL = Geo.staticMap([latLng.lat, latLng.lng], [[latLng.lat, latLng.lng, @user.profilePhoto()]], 13, [$(window).width(), 100])
        @render()

      window.GLOBALS.Checkins.recent().done @loadCheckins

      @render()

    render: ->
      html = @template
        checkins: @checkins
        CheckinShowTemplate: CheckinShowTemplate
        mapURL: @mapURL
        nearbyCheckins: @nearbyCheckins
        user: @user

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

    toggleTabs: (event) ->
      @$('x-tabbar-tab,x-slide').removeClass('active')
      $(event.target).addClass('active')
      $($(event.target).data('target-selector')).addClass('active')

  return {
    Show: ShowView
  }
