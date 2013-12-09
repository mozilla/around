define ['zepto', 'underscore', 'backbone', 'moment', 'cs!lib/geo', 'cs!views/checkins', 'tpl!templates/checkins/show.html.ejs', 'tpl!templates/timeline/show.html.ejs'], ($, _, Backbone, moment, Geo, CheckinViews, CheckinShowTemplate, TimelineShowTemplate) ->
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

    _timeoutForRefresh: null
    _timeoutLength: 30000 # Refresh times every 30 seconds

    events:
      'click #timeline .check-in': 'showCheckinModal'
      'click #timeline .happening': 'refreshFriendsCheckins'
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

        if !@nearbyCheckins or @nearbyCheckins.length == 0
          window.router.navigate "worldwide",
            replace: true
            trigger: true

      $('#timeline .happening').removeClass 'refreshing'

      @render()

      # Refresh the view every minute to update the times.
      @refreshTimes()

    refreshFriendsCheckins: (event) ->
      $(event.target).addClass 'refreshing'

      @loadingCheckins = true
      @render()

      window.GLOBALS.Checkins.recent(true).done @loadCheckins

    # Refresh all relative times in the timeline so they don't ever appear
    # out-of-date.
    # TODO: Offer this in an x-tag or something globally, so all <time> tags
    # with a relative data-relative="true" refresh every minute in the app?
    refreshTimes: ->
      $('.checkin time').each ->
        $(this).text moment($(this).attr('datetime')).fromNow()

      @_timeoutForRefresh = setTimeout @refreshTimes, @_timeoutLength

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
