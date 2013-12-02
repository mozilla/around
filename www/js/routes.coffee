define ['zepto', 'backbone', 'backbone_routefilter', 'cs!views/app', 'cs!views/checkins', 'cs!views/timeline', 'cs!views/users', 'cs!views/venues'], ($, Backbone, BackboneRoutefilter, AppView, CheckinViews, TimelineViews, UserViews, VenueViews) ->
  'use strict'

  appView = undefined

  AppRouter = Backbone.Router.extend
    routes:
      "access_token=:token": "userCreate"
      # Check-in views
      "checkins/:id": "checkinShow"
      # Explore view; see what's around without checking in.
      "explore": "explore"
      "explore/:section": "explore"
      # User views
      "login": "userLogin"
      # "users": "userList"
      "users/:id": "userShow"
      "venues/:id": "venueShow"
      "nearby": "index"
      "worldwide": "index"
      "": "index"

    initialize: ->
      _.bindAll this

      # Redirect to the /# URL for history purposes if it's not set.
      window.location.hash = '#' if window.location.hash is ''

      # Initialize the application view and assign it as a global.
      appView = new AppView()
      window.app = appView

      return this

    # Run after each routing action is complete.
    after: (route) ->
      @_historyCleanup(route)
      @_modifyTitle(route)

    # Main view; shows the timeline view.
    index: ->
      if window.location.hash == '#worldwide'
        startingScope = 'worldwide'
      else
        startingScope = 'nearby'
      appView.currentView = new TimelineViews.Show
        scope: startingScope

    # Show information about a check-in including points, comments, etc.
    checkinShow: ->
      return

    # The famous "Explore" view, where users can see what's in the area; from
    # popular venues to coffee to trending.
    explore: (section) ->
      appView.currentView = new VenueViews.Explore
        section: section

    # User creation route; we get the user's login token here and save
    # it to our datastore.
    userCreate: (token) ->
      # Create our "self" user and save it to our datastore. After that, we'll
      # navigate back to the index view to load up our app with a user setup.
      $.when(UserViews.CreateSelf token).done =>
        @navigate '',
          replace: true
          trigger: true

    userLogin: ->
      # Don't allow authorized users to access the login page.
      if window.GLOBALS.Users.getSelf()
        @navigate '',
          replace: true
          trigger: true
      else
        appView.currentView = new UserViews.Login()

    # Show a user's profile. The template adjusts for various user
    # relationships, including the case where this is the active/self user's
    # profile.
    userShow: (id) ->
      appView.currentView = new UserViews.Show
        el: "#content"
        $el: $("#content")
        id: id

    # Show a venue's main page. Will include a check-in button and options to
    # like/dislike the venue.
    venueShow: (id) ->
      appView.currentView = new VenueViews.Show
        el: "#content"
        $el: $("#content")
        id: id

    # Do some slightly-messy DOM cleanup on history state change.
    _historyCleanup: (route) ->
      if _.contains ['', 'login', 'nearby', 'worldwide'], route
        $('body').addClass 'hide-back-button'
      else
        $('body').removeClass 'hide-back-button'

    # Modify the title tag; for now simply a debugging tool to show route in
    # history.
    _modifyTitle: (route) ->
      if route is 'explore' or route is 'explore/:section'
        $('x-appbar').addClass('explore')
      else
        $('x-appbar').removeClass('explore')

      $('title').text "around: #{window.location.hash}"

  return AppRouter
