# The main app view, loaded when the app is started. Not much happens here,
# it just loads up other views after it loads app.html.ejs into the <body>.
define ['zepto', 'underscore', 'backbone', 'tpl!templates/modal.html.ejs'], ($, _, Backbone, ModalTemplate) ->
  'use strict'

  # This is a generic modal view, which includes a "dismiss" button and option
  # for fixed content before the updating content inside the modal. Supplying
  # the `isFullModal: true` option will result in a full-screen modal. If one
  # existed beforehand, it will be destroyed. Regular modals can, however, be
  # stacked.
  # TODO: Add limit to stacked modals?
  # TODO: Replace old full screen modals.
  ModalView = Backbone.View.extend
    _el: '#modal-content'
    fixedContent: ''
    isFullModal: false

    # Load the fixed content and template HTML into the modal, then add it to
    # the body of the page.
    initialize: ->
      _.bindAll this

      $('body').append ModalTemplate({
        element: @_el
        fixedContent: @fixedContent
        isFullModal: @isFullModal
        templateHTML: "<div id=\"#{@_el.replace '#', ''}\">#{@template(@_templateData())}</div>"
      })

      @setElement(@_el)

      @_initialize() if @_initialize

      @render()

    render: ->
      html = @template(@_templateData())

      @$el.html(html)

      @_render() if @_render

    dismiss: ->
      $parent = @$el.parent().parent()
      @remove()
      $parent.remove()

    _templateData: ->
      {}

  return ModalView
