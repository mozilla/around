define ['zepto', 'underscore', 'backbone', 'tpl!templates/app.html.ejs'], ($, _, Backbone, AppTemplate) ->
  'use strict'

  AppView = Backbone.View.extend
    el: 'body'
    $el: $('body')
    template: AppTemplate

    initialize: ->
      @render()

    render: ->
      $(@$el).html(@template)
