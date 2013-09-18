# User Model
# ==========
#
# Used to store data about any user, from friends to other users to the
# "active"/signed-in user of the app. Most of the user attributes are directly
# mapped to the response from the Foursquare API
# (https://developer.foursquare.com/docs/responses/user).
define ['backbone'], (Backbone) ->
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

    name: ->
      "#{@get('firstName')} #{@get('lastName')}"

    profilePhoto: (size = 100) ->
      "#{@get('photo').prefix}#{size}x#{size}#{@get('photo').suffix}"
    , CONSTANTS

  return User
