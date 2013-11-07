define ['underscore', 'zepto', 'backbone', 'backbone_store', 'cs!api', 'cs!models/user'], (_, $, Backbone, Store, API, User) ->
  'use strict'

  # A super-simple collection of all Users. Mostly useful when looking for the
  # "self" user on init.
  UserCollection = Backbone.Collection.extend
    localStorage: new Store 'Users'
    model: User

    # Get a user by their Foursquare ID. Will make a request to the Foursquare
    # API if the user is not available in the local datastore.
    get: (id, callbacks = {}) ->
      results = @where {id: id}
      return callbacks.success(results[0]) if results.length and callbacks.success

      self = this

      # Get information about this user.
      API.request "users/#{id}",
        success: (data) ->
          user = self.create(data.response.user)
          user.save()

          callbacks.success(user) if callbacks.success
        error: (xhr, type) ->
          if xhr.status == 400
            # User doesn't exist if 400 error code.
            callbacks.error(xhr.response) if callbacks.error

    getSelf: ->
      user = @where {relationship: User.RELATIONSHIP_SELF}
      if user.length then user[0] else null

  return new UserCollection()
