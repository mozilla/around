# The main app view, loaded when the app is started. Not much happens here,
# it just loads up other views after it loads app.html.ejs into the <body>.
define ['zepto', 'underscore', 'backbone', 'cs!collections/users', 'cs!views/users', 'tpl!templates/app.html.ejs'], ($, _, Backbone, Users, UserViews, AppTemplate) ->
  'use strict'

  AppView = Backbone.View.extend
    currentView: null
    el: 'body'
    $el: $('body')
    template: AppTemplate

    # Initialize the app. First thing we do is check to see if there's a "self"
    # user already present (there should only ever be one). If there is, we'll
    # load up the default first-load view; otherwise we'll show a login screen
    # so they can authorize their account and we can get their OAuth access
    # token.
    initialize: ->
      _(this).bindAll '_checkForSelfUser'

      # First thing we do: render the app.
      @render()

    render: ->
      $(@$el).html(@template)

      @_checkForSelfUser()

    # Check to see if there's a User with "self" status. This means we have
    # authorization and are signed in. If not, we'll show an intro/login
    # screen so the user can sign in with Foursquare.
    _checkForSelfUser: ->
      # If we've already checked and @selfUser exists, skip the checks.
      return if @selfUser

      self = this

      Users.fetch
        success: (users) ->
          self.selfUser = Users.getSelf()
          if self.selfUser
            # Load up the app!
            console.log "selfUser", self.selfUser
          else
            console.info "No user with relationship: RELATIONSHIP_SELF found"
            self.currentView = new UserViews.Login
        error: ->
          # TODO: Obviously, make this better.
          window.alert "Error loading podcasts data. Contact support: tofumatt@mozilla.com"
