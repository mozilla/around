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
      _isInRecent: ['boolean', true, false]

    derived:
      # Checkin location, obtained from venue object.
      location:
        deps: ['venue']
        fn: ->
          @venue.location

  return Checkin
