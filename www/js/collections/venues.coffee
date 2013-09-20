define ['underscore', 'backbone', 'localstorage', 'cs!api', 'cs!models/venue'], (_, Backbone, Store, API, Venue) ->
  'use strict'

  VenuesCollection = Backbone.Collection.extend
    localStorage: new Store 'Venues'
    model: Venue

    # Get a venue by its ID. Will make a request to the Foursquare
    # API if the user is not available in the local datastore.
    get: (id, callbacks = {}) ->
      # If the item already exists, skip the API call and return a cached
      # version.
      results = @where {id: id}

      # Return a single item if we only looked for one; otherwise return the
      # array of results.
      return if typeof(id.length) != 'object' and results.length == 1
      then callbacks.success(results[0]) else callbacks.success(results)

      self = this

      # TODO: Use a search to find multiple venues? Is that even likely?
      # Probably not?
      # Get information about this venue.
      API.request "venues/#{id}",
        success: (data) ->
          venue = self.create(data.response.venue)
          venue.save()

          callbacks.success(venue)
        error: (xhr, type) ->
          if xhr.status == 400
            # Venue doesn't exist if 400 error code.
            callbacks.error(xhr.response)

  return new VenuesCollection()
