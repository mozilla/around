# Venue Model
# ===========
define ['human_model'], (HumanModel) ->
  'use strict'

  # Venue constants
  CONSTANTS = {}

  Venue = HumanModel.define
    type: "venue"

    props:
      id:
        setOnce: true
        type: "string"
      name: ["string"]
      location: ["object", true, {
        lat: null,
        lng: null
      }]
      # contact: {}
      # location: {}
      categories: ["array"]
      verified: ["boolean", true, false]
      # stats: {}
      # url: null
      # hours: null
      # popular: null
      # price: {}
      # specials: {}
      # hereNow: {}
      # mayor: {} # User object... maybe just point to their ID?
      # tips: {}
      # beenHere: ["boolean"]
      shortUrl: ["string"]
      canonicalUrl: ["string"]
      # photos: {}
      # likes: {}
      # like: null
      # dislike: null
      # page: null

    session:
      # Used for search results in explore, etc., but rarely saved/used when
      # a venue is saved.
      flags: ["object", false, {
        outsideRadius: false
        exactMatch: false
      }]

  return _.extend Venue, CONSTANTS
