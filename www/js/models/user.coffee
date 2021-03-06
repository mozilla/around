# User Model
# ==========
#
# Used to store data about any user, from friends to other users to the
# "active"/signed-in user of the app. Most of the user attributes are directly
# mapped to the response from the Foursquare API
# (https://developer.foursquare.com/docs/responses/user).
define ['zepto', 'cs!lib/geo', 'human_model', 'cs!lib/api', 'cs!models/checkin'], ($, Geo, HumanModel, API, Checkin) ->
  'use strict'

  CONSTANTS =
    # Options for relationship are from the Foursquare API:
    #
    # * self
    # * friend
    # * pendingMe (user sent acting user a friend request)
    # * pendingThem (acting user sent a friend request)
    # * followingThem (user is a celebrity/page)
    #
    # We add the option "null" because if there is no relationship the Foursquare
    # API will omit this field. null, obviously, implies no
    # relationship.
    RELATIONSHIP:
      SELF: 'self'
      FRIEND: 'friend'
      REQUEST_SENT: 'pendingMe'
      REQUEST_RECEIVED: 'pendingThem'
      FOLLOWING: 'followingThem'
      NONE: null

    # Options for special types of users.
    #
    # * page (example: https://foursquare.com/bravo)
    # * chain (example: https://foursquare.com/starbucks)
    # * celebrity (example: https://foursquare.com/mariobatali)
    # * venuePage (example: https://foursquare.com/v/my-arena/4f70bbfa7b0caa2285cc0de9)
    TYPE:
      USER: null
      PAGE: 'page'
      CHAIN: 'chain'
      CELEBRITY: 'celebrity'
      VENUE: 'venuePage'

  User = HumanModel.define
    type: "user"

    props:
      id:
        setOnce: true
        type: "string"
      firstName: ['string']
      lastName: ['string']
      photo: ['object']
      relationship:
        allowNull: true
        default: CONSTANTS.RELATIONSHIP.NONE
        type: "string"
      type:
        allowNull: true
        default: CONSTANTS.TYPE.USER
        type: "string"
      # friends: null
      homeCity: ['string']
      gender: ['string']
      # contact: null
      bio: ['string']
      # tips: null
      checkins: ['object']
      currentLocation: ['object']

      access_token: ['string', true]

      lastUpdated: ["number"]

    derived:
      # User's full name.
      name:
        deps: ['firstName', 'lastName']
        fn: ->
          nameString = ""
          nameString += @firstName if @firstName
          nameString += " #{@lastName}" if @lastName

          nameString

    # Check this user into a venue. Creates a new check-in object added to this
    # user account.
    checkIn: (venue, shout = null) ->
      d = $.Deferred()

      # Try to get the user's exact location to send to Foursquare. Regardless
      # of location data, we will check-in the user.
      Geo.getCurrentPosition().done (position, latLng, accuracy) =>
        postData = {venueId: venue}

        # If location has a code and no coords object, the geolocation request
        # failed and we'll post to the Foursquare API without it.
        # TODO: Consider abstracting geo requests and storing recent ones in
        # a global with the timestamp so we can re-use recent requests.
        if !position.code and position.coords
          _.extend postData, {
            ll: "#{latLng.lat},#{latLng.lng}"
            llAcc: accuracy
          }

        if shout and shout.length
          _.extend postData, {
            shout: shout
          }

        API.request 'checkins/add',
          data: postData
          requestMethod: "POST"
        .done (data) =>
          # Set the user's current location.
          @currentLocation = {
            timestamp: window.timestamp()
            venue: data.response.checkin.venue
          }

          @save()

          # Add a checkin to this user's collection.
          checkin = new Checkin(data.response.checkin)
          checkin.isFromFriend = true
          checkin.response = data.response

          window.GLOBALS.Checkins.add(checkin)
          checkin.save()

          d.resolve(checkin)

      d.promise()

    # Return true if this object is out-of-date and should be refreshed using
    # Foursquare's API.
    isOutdated: ->
      @lastUpdated + window.GLOBALS.HOUR < window.timestamp()

    # Return the absolute URL to this user's profile photo at a given size.
    # Defaults to 100px x 100px.
    profilePhoto: (size = 100) ->
      return "" unless @photo
      "#{@photo.prefix}#{size}x#{size}#{@photo.suffix}"

  return _.extend User, CONSTANTS
