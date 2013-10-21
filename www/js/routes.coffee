define ['zepto', 'backbone', 'cs!views/app', 'cs!views/checkins', 'cs!views/users', 'cs!views/venues'], ($, Backbone, AppView, CheckinViews, UserViews, VenueViews) ->
  'use strict'

  appView = undefined

  AppRouter = Backbone.Router.extend
    routes:
      "access_token=:token": "userCreate"
      # Check-in views
      "checkin": "checkinModal"
      "checkins/:id": "checkinShow"
      "checkins/create/:id": "checkinCreate"
      # User views
      # "users": "userList"
      "users/:id": "userShow"
      "venues/:id": "venueShow"
      "": "index"

    initialize: ->
      @on "all", @_modifyTitle

      # Initialize the application view and assign it as a global.
      appView = new AppView()
      window.app = appView

      appView._checkForSelfUser()

      return this

    # Main view; shows the timeline view.
    index: ->
      # @navigate 'timeline', {trigger: true}
      console.log "index"
      appView.render()

    # Create a new check-in at a venue based on its venue ID.
    checkinCreate: (id) ->
      $('#check-in').hide()
      $('#content').show()

      @checkinView = new CheckinViews.Create(id)

    # Activated when the "check in" button at the bottom of the screen is
    # tapped.
    checkinModal: ->
      $('#content').hide()
      $('#check-in').show()

      @checkinView = new CheckinViews.ModalFromVenues
        el: '#check-in'
        $el: $('#check-in')

    # Show information about a check-in including points, comments, etc.
    checkinShow: ->
      return

    # User creation route; we get the user's login token here and save
    # it to our datastore.
    userCreate: (token) ->
      self = this
      # Create our "self" user and save it to our datastore. After that, we'll
      # navigate back to the index view to load up our app with a user setup.
      UserViews.CreateSelf token, ->
        self.navigate '', {replace: true, trigger: true}

    # Show a user's profile. The template adjusts for various user
    # relationships, including the case where this is the active/self user's
    # profile.
    userShow: (id) ->
      appView.currentView = new UserViews.Show
        el: "#content"
        $el: $("content")
        id: id

    # Show a venue's main page. Will include a check-in button and options to
    # like/dislike the venue.
    venueShow: (id) ->
      appView.currentView = new VenueViews.Show
        el: "#content"
        $el: $("content")
        id: id

    # Modify the title tag; for now simply a debugging tool to show route in
    # history.
    _modifyTitle: ->
      $('title').text "around: #{window.location.hash}"

  return AppRouter
