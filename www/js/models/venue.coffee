# Venue Model
# ===========
define ["human_model"], (HumanModel) ->
  "use strict"

  # Venue constants
  CONSTANTS =
    # Available "section" queries, mostly for reference.
    SECTIONS:
      "Everything": null
      "Food": "food"
      "Drinks": "drinks"
      "Coffee": "coffee"
      "Shopping": "shops"
      "Arts": "arts"
      "Outdoors": "outdoors"
      "Sights": "sights"
      "Trending": "trending"

      "Specials": "specials"
      "Where to go next?": "nextVenues"
      "Top Picks": "topPicks"

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
      categories: ["array"]
      verified: ["boolean", true, false]
      # stats: {}
      # url: null
      # hours: null
      # popular: null
      # price: {}
      # specials: {}
      hereNow: ["object"]
      mayor: ["object"] # User object... maybe just point to their ID?
      # tips: ['object']
      # beenHere: ["boolean"]
      shortUrl: ["string"]
      canonicalUrl: ["string"]
      photos: ["object"]
      likes: ["object"]
      like: ["boolean"]
      dislike: ["boolean"]
      # page: null

    photosInGroup: (type = "venue") ->
      return [] unless @photos and @photos.count

      photoGroup = _.filter @photos.groups, (group) ->
        group.type is type

      photoGroup[0].items

    tips: ->
      window.GLOBALS.Tips.getForVenue(@id)

    session:
      # Used for search results in explore, etc., but rarely saved/used when
      # a venue is saved.
      flags: ["object", false, {
        outsideRadius: false
        exactMatch: false
      }]

  return _.extend Venue, CONSTANTS
