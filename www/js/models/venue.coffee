# Venue Model
# ===========
define ["zepto", "api", "human_model"], ($, API, HumanModel) ->
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

    initialize: (data) ->
      @_attributes = data.attributes if data.attributes

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
      _attributes: ["object"]
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

    derived:
      info:
        deps: ['_attributes']
        fn: ->
          return [] unless @_attributes.groups

          _.map @_attributes.groups, (group) ->
            {
              name: group.items[0].displayName
              value: group.items[0].displayValue
            }
      # Text address of location; as precise as possible.
      streetAddress:
        deps: ['location']
        fn: ->
          return null unless @location.address

          crossStreet = if @location.crossStreet then " (#{@location.crossStreet})" else ""
          "#{@location.address}#{crossStreet}"

    hours: ->
      d = $.Deferred()

      API.request("venues/#{@id}/hours").done (data) ->
        hours = {}
        popular = {}

        if data.response.hours.length
          data.response.hours.forEach (day) ->
            hours[day.days[0]] = []
            day.open.forEach (segment) ->
              hours[day.days[0]].push {
                closes: segment.end
                opens: segment.start
              }

        if data.response.popular.timeframes.length
          data.response.popular.timeframes.forEach (day) ->
            popular[day.days[0]] = []
            day.open.forEach (segment) ->
              popular[day.days[0]].push {
                closes: segment.end
                opens: segment.start
              }

        d.resolve {
          hours: hours
          popular: popular
        }
      .fail ->
        d.reject()

      d.promise()

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
