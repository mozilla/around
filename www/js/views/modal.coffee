# A generic modal view, with optional full-screen modal (see the "check in"
# view launched from the timeline for an example). Meant to be extended by
# another view which means to be the content INSIDE the modal.
#
# You can use the _initalize() and _render() methods to take the place of the
# usual Backbone view methods; they will be called after the base view's
# methods are called. You can extend the view with `isFullModal: true` in order
# to get a full-screen modal with a "Dismiss" button at the bottom.
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
    modal: null

    events:
      "click .cancel": "dismiss"

    # Load the fixed content and template HTML into the modal, then add it to
    # the body of the page.
    initialize: ->
      if @isFullModal
        return if $('#full-modal').length
      else
        return if $('.modal.standard').length

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
