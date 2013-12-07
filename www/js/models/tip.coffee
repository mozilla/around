# Tip Model
# =========
define ["human_model"], (HumanModel) ->
  "use strict"

  Tip = HumanModel.define
    type: "tip"

    props:
      id:
        setOnce: true
        type: "string"
      text: ["string"]
      location: ["object", true, {
        lat: null,
        lng: null
      }]
      createdAt: ['date']
      status: ['string']
      url: ['string']
      # photo: ['object']
      user: ['object']
      venue: ['object']
      likes: ['object']
      _venueID: ['string']

      lastUpdated: ["number"]

    # Return true if this object is out-of-date and should be refreshed using
    # Foursquare's API.
    isOutdated: ->
      @lastUpdated + (window.GLOBALS.HOUR * 12) < window.timestamp()

  return _.extend Tip
