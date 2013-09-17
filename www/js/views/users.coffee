# User views. Includes "first run" login screen, and all views related to user
# tasks.
define ['zepto', 'underscore', 'backbone', 'cs!collections/users', 'tpl!templates/users/login.html.ejs'], ($, _, Backbone, Users, LoginTemplate) ->
  'use strict'

  LoginView = Backbone.View.extend
    el: '#content'
    $el: $('#content')
    template: LoginTemplate

    initialize: ->
      @render()

    render: ->
      console.log $(@$el)
      html = @template
        loginURL: window.GLOBALS.AUTH_URL
      $(@$el).html(html)

  return {
    Login: LoginView
  }
