# User Model
# ==========
#
# Used to store data about any user, from friends to other users to the
# "active"/signed-in user of the app. Most of the user attributes are directly
# mapped to the response from the Foursquare API
# (https://developer.foursquare.com/docs/responses/user).
define ['zepto', 'backbone', 'cs!api', 'cs!collections/checkins', 'cs!collections/venues'], ($, Backbone, API, Checkins, Venues) ->
  'use strict'

  CONSTANTS = {}

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
  CONSTANTS.RELATIONSHIP_SELF = 'self'
  CONSTANTS.RELATIONSHIP_FRIEND = 'friend'
  CONSTANTS.RELATIONSHIP_REQUEST_SENT = 'pendingMe'
  CONSTANTS.RELATIONSHIP_REQUEST_RECEIVED = 'pendingThem'
  CONSTANTS.RELATIONSHIP_FOLLOWING = 'followingThem'
  CONSTANTS.RELATIONSHIP_NONE = null

  # Options for special types of users.
  #
  # * page (example: https://foursquare.com/bravo)
  # * chain (example: https://foursquare.com/starbucks)
  # * celebrity (example: https://foursquare.com/mariobatali)
  # * venuePage (example: https://foursquare.com/v/my-arena/4f70bbfa7b0caa2285cc0de9)
  CONSTANTS.TYPE_USER = null
  CONSTANTS.TYPE_PAGE = 'page'
  CONSTANTS.TYPE_CHAIN = 'chain'
  CONSTANTS.TYPE_CELEBRITY = 'celebrity'
  CONSTANTS.TYPE_VENUE = 'venuePage'

  User = Backbone.Model.extend
    defaults:
      # _self: false # Is this the user we are signed in as on our device?
      # _isFriend: false # By default, we aren't friends with a user.
      _createdAt: null
      _updatedAt: null

      id: undefined
      firstName: ''
      lastName: ''
      photo: ''
      relationship: CONSTANTS.RELATIONSHIP_NONE
      # friends: null
      type: CONSTANTS.TYPE_USER
      venue: null
      homeCity: ''
      gender: null
      contact: null
      bio: ''
      tips: null

      access_token: ''

    # Check this user into a venue. Creates a new check-in object added to this
    # user account.
    checkIn: (venue, callbacks = {}) ->
      d = $.Deferred()

      doCheckIn = (location) ->
        postData = {venueId: venue}

        # If location has a code and no coords object, the geolocation request
        # failed and we'll post to the Foursquare API without it.
        # TODO: Consider abstracting geo requests and storing recent ones in
        # a global with the timestamp so we can re-use recent requests.
        unless location.code and !location.coords
          _.extend postData, {
            ll: "#{location.coords.latitude},#{location.coords.longitude}"
            llAcc: location.coords.accuracy
          }

        API.request 'checkins/add',
          data: postData
          requestMethod: "POST"
        .done (response) ->
          # Add a checkin to this user's colllection.
          Checkins.add(response.response.checkin)

          Checkins.get response.response.checkin.id,
            success: (checkin) ->
              callbacks.success(checkin) if callbacks.success

              d.resolve(checkin)

      # Try to get the user's exact location to send to Foursquare. Regardless
      # of location data, we will check-in the user.
      window.navigator.geolocation.getCurrentPosition doCheckIn, doCheckIn

      d.promise()


    name: ->
      "#{@get('firstName')} #{@get('lastName')}"

    profilePhoto: (size = 100) ->
      "#{@get('photo').prefix}#{size}x#{size}#{@get('photo').suffix}"
    , CONSTANTS

  return User
