define ['underscore', 'zepto', 'backbone', 'backbone_store', 'cs!lib/api', 'cs!models/user'], (_, $, Backbone, Store, API, User) ->
  'use strict'

  # A super-simple collection of all Users. Mostly useful when looking for the
  # "self" user on init.
  UserCollection = Backbone.Collection.extend
    model: User
    offlineStore: new Store "Users"

    _selfRequest: null

    initialize: (storeName) ->
      @offlineStore = new Store(storeName) if storeName

    # Get a user by their Foursquare ID. Will make a request to the Foursquare
    # API if the user is not available in the local datastore.
    get: (id, forceUpdate = false) ->
      d = $.Deferred()

      results = @where {id: id}

      unless !results.length or results[0].isOutdated() or forceUpdate
        d.resolve(results[0])
        return d.promise()

      # Get information about this user.
      API.request("users/#{id}").done (data) =>
        user = new User(data.response.user)
        user.lastUpdated = window.timestamp()
        @add(user, {merge: true})
        user.save()

        d.resolve(user)
      .fail (xhr, type) ->
        d.reject(xhr, type) # if xhr.status == 400

      d.promise()

    getSelf: ->
      user = @where {relationship: User.RELATIONSHIP.SELF}

      if user.length
        # Update the current user in the background for now.
        # TODO: Return a promise or something here; this is sloppy.
        if user[0].isOutdated() and !@_selfRequest
          @_selfRequest = @get(user[0].id, true).done => @_selfRequest = null

        user[0]
      else
        null

  return UserCollection
