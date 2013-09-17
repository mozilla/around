define ['underscore', 'backbone', 'localstorage', 'cs!models/user'], (_, Backbone, Store, User) ->
  'use strict'

  # A super-simple collection of all Users. Mostly useful when looking for the
  # "self" user on init.
  UserCollection = Backbone.Collection.extend
    localStorage: new Store 'Users'
    model: User

    getSelf: ->
      user = @where {relationship: User.RELATIONSHIP_SELF}
      if user.length then user[0] else null

  return new UserCollection()
