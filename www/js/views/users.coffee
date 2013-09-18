# User views. Includes "first run" login screen, and all views related to user
# tasks.
define ['zepto', 'underscore', 'backbone', 'cs!collections/users', 'cs!models/user', 'tpl!templates/users/list.html.ejs', 'tpl!templates/users/login.html.ejs', 'tpl!templates/users/show.html.ejs'], ($, _, Backbone, Users, User, ListTemplate, LoginTemplate, ShowTemplate) ->
  'use strict'

  CreateSelf = (token, callback) ->
    # Get information about this user.
    $.ajax
      type: 'GET'
      dataType: 'json'
      url: "#{window.GLOBALS.API_URL}users/self?oauth_token=#{token}&v=#{window.GLOBALS.API_DATE}"
      success: (data) ->
        # Save this user's access_token for future requests.
        window.GLOBALS.TOKEN = token
        window.localStorage._ACCESS_TOKEN = token

        user = Users.create(data.response.user)
        user.set
          access_token: token
          relationship: User.RELATIONSHIP_SELF
        user.save()

        callback(user)

  ListView = Backbone.View.extend
    template: ListTemplate

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

  ShowView = Backbone.View.extend
    model: User
    template: ShowTemplate

    initialize: ->
      self = this

      Users.get @id, (user) ->
        self.model = user
        self.render()

    render: ->
      console.log "User #{this.model.get('id')}", this.model.attributes
      html = @template
        user: @model
      $(@$el).html(html)

  return {
    CreateSelf: CreateSelf
    List: ListView
    Login: LoginView
    Show: ShowView
  }
