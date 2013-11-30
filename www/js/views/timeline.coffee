define ['zepto', 'underscore', 'backbone', 'cs!lib/geo', 'cs!views/checkins', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/timeline/show.html.ejs'], ($, _, Backbone, Geo, CheckinViews, CheckinShowTemplate, TimelineShowTemplate) ->
  'use strict'

  ShowView = Backbone.View.extend
    el: "#timeline"
    $el: $("#timeline")
    modal: false
    template: TimelineShowTemplate

    fixedContent: '<div id="timeline"></div>'

    checkins: null
    loadingCheckins: true
    mapURL: null
    nearbyCheckins: null

    events:
      'click #timeline .check-in': 'showCheckinModal'
      'click #timeline a.refresh': 'refreshFriendsCheckins'
      # HACK: This should work in brick, but currently doesn't.
      'click x-tabbar-tab': 'toggleTabs'

    initialize: ->
      _.bindAll this

      $('#content').html @fixedContent
      @setElement '#timeline'

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
        loadingCheckins: @loadingCheckins
        mapURL: @mapURL
        nearbyCheckins: @nearbyCheckins
        scope: @options.scope
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
        @loadingCheckins = false
        @render()

      @render()

    refreshFriendsCheckins: ->
      @loadingCheckins = true
      @render()

      window.GLOBALS.Checkins.recent(true).done @loadCheckins

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

      @options.scope = $(event.target).data('scope')
      window.router.navigate $(event.target).data('scope'),
        replace: true
        trigger: false 

  return {
    Show: ShowView
  }
