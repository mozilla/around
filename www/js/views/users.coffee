# User views. Includes "first run" login screen, and all views related to user
# tasks.
define ['zepto', 'underscore', 'backbone', 'cs!collections/users', 'cs!models/user', 'tpl!templates/users/login.html.ejs'], ($, _, Backbone, Users, User, LoginTemplate) ->
  'use strict'

  CreateSelf = (token, callback) ->
    # Get information about this user.
    $.ajax
      type: 'GET'
      dataType: 'json'
      url: "#{window.GLOBALS.API_URL}users/self?oauth_token=#{token}&v=#{window.GLOBALS.API_DATE}"
      success: (data) ->
        # console.log "hi", data
        user = Users.create(data.response.user)
        user.set
          access_token: token
          relationship: User.RELATIONSHIP_SELF
        user.save()

        callback(user)

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
      console.log $(@$el)
      html = @template
        loginURL: window.GLOBALS.AUTH_URL
      $(@$el).html(html)

  return {
    CreateSelf: CreateSelf
    Login: LoginView
  }
