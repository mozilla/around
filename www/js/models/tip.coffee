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

  return _.extend Tip
