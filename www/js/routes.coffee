define ['backbone', 'cs!views/app', 'cs!views/users'], (Backbone, AppView, UserViews) ->
  'use strict'

  appView = undefined

  AppRouter = Backbone.Router.extend
    routes:
      'access_token=:token': 'createUser',
      '': 'index'

    initialize: ->
      if not appView
        # Initialize the application view and assign it as a global.
        appView = new AppView()
        window.app = appView

      return this

    # Main view; shows the timeline view.
    index: ->
      # @navigate 'timeline', {trigger: true}
      console.log "index"
      appView.render()

    # User creation route; we get the user's login token here and save
    # it to our datastore.
    createUser: (token) ->
      self = this
      # Create our "self" user and save it to our datastore. After that, we'll
      # navigate back to the index view to load up our app with a user setup.
      UserViews.CreateSelf token, ->
        self.navigate '', {trigger: true}

  return AppRouter;
