# Check-in Model
# ==============
define ['human_model'], (HumanModel) ->
  'use strict'

  Checkin = HumanModel.define
    type: "checkin"

    props:
      id:
        setOnce: true
        type: "string"

      comments: ['object']
      photos: ['object']
      source: ['object']
      user: ['object']
      venue: ['object']

      shout: ['string']

      createdAt: ['date']
      
      isFromFriend: ['boolean', true, false]

      lastUpdated: ["number"]

      # TODO: Make this a computed property by looking for properties that
      # would only be in a full object rather than an attribute we manually set.
      isFullObject: ['boolean', true, false]

    derived:
      # Checkin location, obtained from venue object.
      location:
        deps: ['venue']
        fn: ->
          @venue.location

      # App URL for this checkin, used to display GET links to it in the app.
      url:
        deps: ['id']
        fn: ->
          "#/checkins/#{@id}"

    session:
      # The entire API response object, used for insight modals and such.
      response: ["object"]

    # Return true if this object is out-of-date and should be refreshed using
    # Foursquare's API.
    isOutdated: ->
      @lastUpdated + (window.GLOBALS.HOUR * 12) < window.timestamp()

  return Checkin
