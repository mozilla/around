define ['underscore', 'backbone', 'localstorage', 'cs!api', 'cs!models/venue'], (_, Backbone, Store, API, Venue) ->
  'use strict'

  VenuesCollection = Backbone.Collection.extend
    localStorage: new Store 'Venues'
    model: Venue

    # Get a venue (or venues) by its ID. Will make a request to the Foursquare
    # API if the user is not available in the local datastore.
    get: (id, callbacks = {}) ->
      # If the item already exists, skip the API call and return a cached
      # version.
      results = @where {id: id}

      # Return a single item if we only looked for one; otherwise return the
      # array of results.
      # It's possible that the `id` argument is a single venue ID or an array
      # of venues to display. If we only looked for a single venue and found
      # one locally we can skip the API call. Likewise, if we found the same
      # number of venues locally as we requested, we'll skip the API request.
      if typeof(id) is 'object' and results.length > 1 and callbacks.success
        return callbacks.success(results)
      else if results.length == 1 and callbacks.success
        return callbacks.success(results[0])

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
            callbacks.error(xhr.response) if callbacks.error

    # Return a list of venues from the Foursquare API based on a location.
    # For now, this always makes a request to the Foursquare API, but we should
    # intelligently near with caching geo requests in the future.
    # TODO: Deal with caching of coords and explore/nearby venue requests.
    # The coords object is an HTML5 Geolocation `Coordinates` object. Read more
    # here: https://developer.mozilla.org/en-US/docs/Web/API/Coordinates
    near: (coords, callbacks = {}) ->
      self = this

      # TODO: Use a search to find multiple venues? Is that even likely?
      # Probably not?
      # Get information about this venue.
      API.request "venues/explore",
        data: coords
        success: (data) ->
          callbacks.success(data.response)
        error: (xhr, type) ->
          if xhr.status == 400 and callbacks.error
            # Venue doesn't exist if 400 error code.
            callbacks.error(xhr.response)

  return new VenuesCollection()
