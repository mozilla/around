define ['zepto', 'underscore', 'backbone', 'cs!collections/checkins', 'cs!collections/users', 'cs!collections/venues', 'cs!models/checkin', 'tpl!templates/checkins/create-from-venues.html.ejs', 'tpl!templates/checkins/insight.html.ejs'], ($, _, Backbone, Checkins, Users, Venues, Checkin, CreateFromVenuesTemplate, InsightTemplate) ->
  'use strict'

  # View to create a check-in for a user. Pass a user and a venue object in
  # and we create a new check-in.
  CreateView = Backbone.View.extend
    initialize: (venue, user = null) ->
      user = Users.getSelf() unless user

      self = this

      user.checkIn venue,
        success: (checkin) ->
          # Navigate to the venue page first, then load our insight modal.
          # TODO: This shouldn't be part of state; load it in as a special
          # modal view instead?
          window.router.navigate "venues/#{checkin.get('venue').id}",
            replace: true
            trigger: true

          $('#modal').show()
          new InsightModalView
            id: checkin.get('id')

  InsightModalView = Backbone.View.extend
    el: '#modal'
    $el: $('#modal')
    model: Checkin
    template: InsightTemplate

    events:
      "click #modal": "goToVenue"
      "click .accept": "goToVenue"

    initialize: ->
      self = this

      Checkins.get @id,
        success: (checkin) ->
          self.model = checkin
          self.render()
        error: (response) ->
          # If there was an error, we should abandon ship and head to the index
          # page.
          window.router.navigate "",
            replace: true
            trigger: true

    render: ->
      html = @template
        checkin: @model

      $(@$el).html(html)

    goToVenue: ->
      $('#modal').hide()
      window.router.navigate "venues/#{@model.get('venue').id}",
        replace: true
        trigger: true

  # View to create a check-in from a list of venues. This is the view that
  # appears when the user taps the "check in" button at the bottom of the
  # screen.
  ModalFromVenuesView = Backbone.View.extend
    position: null
    template: CreateFromVenuesTemplate
    user: null
    venues: []

    events:
      "click .venue": "checkInToVenue"

    # Get the relevant local venues for this user while we render the template.
    initialize: ->
      @on ''
      _(this).bindAll "render", "_geoSuccess"

      window.navigator.geolocation.getCurrentPosition(
        @_geoSuccess, @_geoError
      )

      @render()

    render: ->
      html = @template
        position: @position
        venues: @venues

      $(@$el).html(html)

    checkInToVenue: (event) ->
      window.router.navigate "checkins/create/#{$(event.currentTarget).data('venue')}",
        replace: true
        trigger: true

    _geoSuccess: (position) ->
      self = this

      @position = position

      Venues.near {
          ll: "#{@position.coords.latitude},#{@position.coords.longitude}"
          accuracy: @position.coords.accuracy
        },
        success: (venues) ->
          _(venues.groups[0].items).each (item) ->
            self.venues.push item.venue

          self.render()
        error: (response) ->
          window.alert "Error!"

      @render

    _geoError: () ->
      return

  return {
    Create: CreateView
    InsightModal: InsightModalView
    ModalFromVenues: ModalFromVenuesView
  }
