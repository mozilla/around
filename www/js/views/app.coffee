# The main app view, loaded when the app is started. Not much happens here,
# it just loads up other views after it loads app.html.ejs into the <body>.
define ['zepto', 'underscore', 'backbone', 'cs!collections/users', 'cs!views/users', 'tpl!templates/app.html.ejs'], ($, _, Backbone, Users, UserViews, AppTemplate) ->
  'use strict'

  AppView = Backbone.View.extend
    el: 'body'
    $el: $('body')
    template: AppTemplate

    # Initialize the app. First thing we do is check to see if there's a "self"
    # user already present (there should only ever be one). If there is, we'll
    # load up the default first-load view; otherwise we'll show a login screen
    # so they can authorize their account and we can get their OAuth access
    # token.
    initialize: ->
      # First thing we do: render the app.
      @render()

      # Check to see if there's a User with "self" status. This means we have
      # authorization and are signed in. If not, we'll show an intro/login
      # screen so the user can sign in with Foursquare.
      Users.fetch
        success: (users) ->
          if users.length
            # Load up the app!
            console.log users
          else
            console.log 'No users found', users
            loginView = new UserViews.Login
          error: ->
            # TODO: Obviously, make this better.
            window.alert "Error loading podcasts data. Contact support: tofumatt@mozilla.com"

    render: ->
      $(@$el).html(@template)
