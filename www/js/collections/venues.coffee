define ['underscore', 'backbone', 'localstorage', 'cs!api', 'cs!models/venue'], (_, Backbone, Store, API, Venue) ->
  'use strict'

  VenuesCollection = Backbone.Collection.extend
    localStorage: new Store 'Venues'
    model: Venue

    # Get a venue by its ID. Will make a request to the Foursquare
    # API if the user is not available in the local datastore.
    get: (id, callbacks = {}) ->
      results = @where {id: id}
      return callbacks.success(results[0]) if results.length

      self = this

      # Get information about this user.
      API.request "venues/#{id}",
        success: (data) ->
          # console.log "hi", data
          venue = self.create(data.response.venue)
          venue.save()

          callbacks.success(venue)
        error: (xhr, type) ->
          if xhr.status == 400
            # User doesn't exist if 400 error code.
            callbacks.error(xhr.response)

  return new VenuesCollection()
