# User views. Includes "first run" login screen, and all views related to user
# tasks.
define ['zepto', 'underscore', 'backbone', 'localforage', 'cs!models/user', 'tpl!templates/users/list.html.ejs', 'tpl!templates/users/login.html.ejs', 'tpl!templates/users/show.html.ejs'], ($, _, Backbone, localForage, User, ListTemplate, LoginTemplate, ShowTemplate) ->
  'use strict'

  # Static method called to create a user, then run a callback once the user
  # is created. Callback isn't run until the Foursquare API returns information
  # about the user.
  CreateSelf = (token) ->
    d = $.Deferred()

    # Get information about this user.
    request = $.ajax
      type: 'GET'
      dataType: 'json'
      url: "#{window.GLOBALS.API_URL}users/self?oauth_token=#{token}&v=#{window.GLOBALS.API_DATE}"

    request.done (data) ->
      # Save this user's access_token for future requests.
      window.GLOBALS.TOKEN = token

      user = new User(data.response.user)
      user.set
        access_token: token
        relationship: User.RELATIONSHIP.SELF

      window.GLOBALS.Users.add(user)
      user.save()

      $.when(localForage.setItem '_ACCESS_TOKEN', token).done ->
        d.resolve(user)

    d.promise()

  ListView = Backbone.View.extend
    template: ListTemplate

  # Login/intro screen shown on first-run or if the user signs out of their
  # account. Basically just a link to auth with Foursquare.
  LoginView = Backbone.View.extend
    el: '#content'
    $el: $('#content')
    template: LoginTemplate

    initialize: ->
      # If we're showing the login screen, we'll kick the footer (with the
      # "Check In" button) off the screen.
      $('x-layout').attr 'maxcontent', true
      @render()

    render: ->
      html = @template
        loginURL: window.GLOBALS.AUTH_URL
      $(@$el).html(html)

  # User profile view. Includes other views inside like a list of recent
  # check-ins, mayorships, etc.
  ShowView = Backbone.View.extend
    model: User
    template: ShowTemplate

    initialize: ->
      window.GLOBALS.Users.get(@id).done (user) =>
        @model = user
        @render()
      .fail =>
        @model = null
        @render()

    render: ->
      html = @template
        user: @model
      $(@$el).html(html)

  return {
    CreateSelf: CreateSelf
    List: ListView
    Login: LoginView
    Show: ShowView
  }
