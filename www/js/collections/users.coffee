define ['underscore', 'backbone', 'localstorage', 'cs!models/user'], (_, Backbone, Store, User) ->
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
      return callbacks.success(results[0]) if results.length

      self = this

      # Get information about this user.
      $.ajax
        type: 'GET'
        dataType: 'json'
        # TODO: Set our access_token as a global? Roll this into a helper function?
        url: "#{window.GLOBALS.API_URL}users/#{id}?oauth_token=#{window.GLOBALS.TOKEN}&v=#{window.GLOBALS.API_DATE}"
        success: (data) ->
          # console.log "hi", data
          user = self.create(data.response.user)
          user.save()

          callbacks.success(user)
        error: (xhr, type) ->
          if xhr.status == 400
            # User doesn't exist if 400 error code.
            callbacks.error(xhr.response)

    getSelf: ->
      user = @where {relationship: User.RELATIONSHIP_SELF}
      if user.length then user[0] else null

  return new UserCollection()
