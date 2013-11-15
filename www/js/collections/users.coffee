define ['underscore', 'zepto', 'backbone', 'backbone_store', 'cs!api', 'cs!models/user'], (_, $, Backbone, Store, API, User) ->
  'use strict'

  # A super-simple collection of all Users. Mostly useful when looking for the
  # "self" user on init.
  UserCollection = Backbone.Collection.extend
    model: User
    offlineStore: new Store "Users"

    initialize: (storeName) ->
      @offlineStore = new Store(storeName) if storeName

    # Get a user by their Foursquare ID. Will make a request to the Foursquare
    # API if the user is not available in the local datastore.
    get: (id) ->
      d = $.Deferred()

      results = @where {id: id}

      if results.length
        d.resolve(results[0])
        return d.promise()

      # Get information about this user.
      API.request("users/#{id}").done (data) =>
        user = new User(data.response.user)
        @add(user)
        user.save()

        d.resolve(user)
      .fail (xhr, type) ->
        d.reject(xhr, type) # if xhr.status == 400

      d.promise()

    getSelf: ->
      user = @where {relationship: User.RELATIONSHIP.SELF}

      if user.length
        user[0]
      else
        null

  return UserCollection
