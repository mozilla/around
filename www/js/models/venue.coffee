# Venue Model
# ===========
define ['backbone'], (Backbone) ->
  'use strict'

  # Venue constants
  CONSTANTS = {}

  Venue = Backbone.Model.extend
    defaults:
      _createdAt: null
      _updatedAt: null

      id: null
      name: ""
      contact: {}
      location: {}
      categories: []
      verified: false
      stats: {}
      url: null
      hours: null
      popular: null
      price: {}
      specials: {}
      hereNow: {}
      mayor: {} # User object... maybe just point to their ID?
      tips: {}
      beenHere: null
      shortUrl: null
      canonicalUrl: null
      photos: {}
      likes: {}
      like: null
      dislike: null

      # Used for search results in explore, etc., but rarely saved/used when
      # a venue is saved.
      flags: {
        outsideRadius: false
        exactMatch: false
      }

      page: null

  return Venue
