# Venue Model
# ===========
define ["zepto", "cs!lib/api", "human_model"], ($, API, HumanModel) ->
  "use strict"

  # Venue constants
  CONSTANTS =
    # Number of photos returned from a /venues/:id called.
    PHOTOS_RETURNED_FROM_GET_CALL: 6
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
      price: ["object"]
      verified: ["boolean", true, false]
      # stats: {}
      # url: null
      # hours: null
      # popular: null
      # price: {}
      # specials: {}
      mayor: ["object"] # User object... maybe just point to their ID?
      # tips: ['object']
      # beenHere: ["boolean"]
      shortUrl: ["string"]
      canonicalUrl: ["string"]
      photos: ["array"]
      likes: ["object"]
      like: ["boolean"]
      dislike: ["boolean"]
      # page: null
      lastUpdated: ["number"]
      isFullObject: ['boolean', true, false]

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

      # App URL for this venue, used to display GET links to it in the app.
      url:
        deps: ['id']
        fn: ->
          "#/venues/#{@id}"

      # App URL for this venue's tips, used to display GET links to the list
      # of venue tips inside the app.
      urlForTips:
        deps: ['id']
        fn: ->
          "#/venues/#{@id}/tips"

    # Add a photo to this venue. This will upload the photo to Foursquare, then
    # add it to the venue model itself once the request is completed. As per
    # Foursquare's API rules, images must be a JPEG, 5MB or smaller.
    #
    # TODO: Resize images on the client if they're too large.
    addPhoto: (photo, postData = {}) ->
      # TODO: Handle this error.
      if photo.size > 5000000
        console.error "Photo bigger than 5MB; upload will fail."

      # TODO: Convert to JPEG?
      unless photo.type != 'image/jpg'
        console.error "Photo is of type #{photo.type}; upload will fail."

      API.upload "photos/add",
        photo: photo,
        venueId: @id
      .done (data) =>
        @photos.push(data.response.photo)
        @save()

    # Dislike this venue, or, if the user already dislikes it, remove their
    # previous "dislike".
    changeDislike: (forceRemove = false) ->
      action = if @dislike or forceRemove then '0' else '1'

      API.request "venues/#{@id}/dislike",
        data:
          action: action
        requestMethod: "POST"
      .done (data) =>
        # Automatically remove a like if we "dislike" this place.
        @changeLike(true) if @like and action is '1'

        @dislike = !@dislike
        @save()

    # Like this venue, or, if the user already likes it, remove their previous
    # "like".
    changeLike: (forceRemove = false) ->
      action = if @like or forceRemove then '0' else '1'

      API.request "venues/#{@id}/like",
        data:
          action: action
        requestMethod: "POST"
      .done (data) =>
        # Automatically remove a dislike if we "like" this place.
        @changeDislike(true) if @dislike and action is '1'

        @likes = data.response
        @like = !@like

    getPhotos: ->
      # TODO: Get photos past the 200 count.
      API.request("venues/#{@id}/photos").done (data) =>
        if data.response.photos and data.response.photos.items
          @photos = data.response.photos.items
        else
          @photos = []

        @save()

    hours: ->
      d = $.Deferred()

      API.request("venues/#{@id}/hours").done (data) ->
        hours = {}
        popular = {}

        if data.response and data.response.hours.length
          data.response.hours.forEach (day) ->
            hours[day.days[0]] = []
            day.open.forEach (segment) ->
              hours[day.days[0]].push {
                closes: segment.end
                opens: segment.start
              }

        if data.response and data.response.popular.timeframes.length
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

    # Return true if this object is out-of-date and should be refreshed using
    # Foursquare's API.
    isOutdated: ->
      @lastUpdated + window.GLOBALS.HOUR < window.timestamp()

    photo: (index = 0) ->
      return null unless @photos.length and @photos[index]

      "#{@photos[index].prefix}#{@photos[index].width}x#{@photos[index].height}#{@photos[index].suffix}"

    tips: ->
      window.GLOBALS.Tips.getForVenue(@id)

    session:
      # Used for search results in explore, etc., but rarely saved/used when
      # a venue is saved.
      flags: ["object", false, {
        outsideRadius: false
        exactMatch: false
      }]
      hereNow: ["object"]

  return _.extend Venue, CONSTANTS
