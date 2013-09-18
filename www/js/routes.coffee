define ['zepto', 'backbone', 'cs!views/app', 'cs!views/users'], ($, Backbone, AppView, UserViews) ->
  'use strict'

  appView = undefined

  AppRouter = Backbone.Router.extend
    routes:
      "access_token=:token": "userCreate"
      # User views
      # "users": "userList"
      "users/:id": "userShow"
      "": "index"

    initialize: ->
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

    # User creation route; we get the user's login token here and save
    # it to our datastore.
    userCreate: (token) ->
      self = this
      # Create our "self" user and save it to our datastore. After that, we'll
      # navigate back to the index view to load up our app with a user setup.
      UserViews.CreateSelf token, ->
        self.navigate '', {trigger: true}

    # Show a user's profile. The template adjusts for various user
    # relationships, including the case where this is the active/self user's
    # profile.
    userShow: (id) ->
      appView.currentView = new UserViews.Show
        el: "#content"
        $el: $("content")
        id: id

  return AppRouter;
