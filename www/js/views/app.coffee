# The main app view, loaded when the app is started. Not much happens here,
# it just loads up other views after it loads app.html.ejs into the <body>.
define ['zepto', 'underscore', 'backbone', 'brick', 'cs!models/user', 'tpl!templates/app.html.ejs'], ($, _, Backbone, xtag, User, AppTemplate) ->
  'use strict'

  AppView = Backbone.View.extend
    currentView: null
    el: 'body'
    $el: $('body')
    template: AppTemplate

    events:
      'click #back': 'goBack'
      'click #full-modal .accept': 'destroyFullModal'
      'longTap #back': 'goToTimeline'

    # Initialize the app. First thing we do is check to see if there's a "self"
    # user already present (there should only ever be one). If there is, we'll
    # load up the default first-load view; otherwise we'll show a login screen
    # so they can authorize their account and we can get their OAuth access
    # token.
    initialize: ->
      _.bindAll this

      # First thing we do: render the app.
      @render()

      @_resizeContent()

      # Setup our window resize event magic.
      @_resizing = false
      $(window).on 'resize', =>
        return if @_resizing

        @_resizing = true

        setTimeout @_resizeContent, 300

    render: ->
      $(@$el).html(@template)

      window.GLOBALS.Users.fetch().done @_checkForSelfUser

    destroyFullModal: ->
      @trigger 'destroy:modal'
      $('#full-modal').remove()

    # Go back one step in the app. For now, we simply use our router to control
    # all state and thus just go back in history. Cheeky!
    goBack: ->
      window.history.back()

    # A long tap on the back button will return the user home, even if they're
    # deeply nested inside the app.
    goToTimeline: ->
      window.router.navigate '',
        replace: true
        trigger: true

    # Check to see if there's a User with "self" status. This means we have
    # authorization and are signed in. If not, we'll show an intro/login
    # screen so the user can sign in with Foursquare.
    _checkForSelfUser: ->
      # If we've already checked and @selfUser exists, skip the checks.
      # HACK: Also skip the check if we're in the sign in process. This
      # prevents the "please sign in screen" from appearing during sign-in.
      return if @selfUser or window.location.hash.match 'access_token='

      @selfUser = window.GLOBALS.Users.getSelf()

      # If there's no "selfUser", we need to display an intro screen/login
      # prompt and authorize the user's device.
      if not @selfUser
        console.info "No user with relationship: RELATIONSHIP_SELF found"
        # We manually set the location.hash here because the router hasn't
        # actually finished loading yet (and thus isn't assigned to
        # `window.router`, where we'd usually access its `.navigate`
        # method).
        # self.render()
        window.location.hash = "login"

    # Set the minimum height of the #content section to be the height of the
    # device.
    _resizeContent: ->
      $('#content').css 'min-height', ($(window).height() - $('x-appbar').height())
      @_resizing = false
