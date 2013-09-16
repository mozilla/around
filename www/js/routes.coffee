define ['backbone'], (Backbone) ->
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
      @navigate 'timeline', {trigger: true}

    # User creation route; we get the user's login token here and save
    # it to our datastore.
    createUser: ->
      appView.currentView = new UsersViews.Create()

  return AppRouter;
