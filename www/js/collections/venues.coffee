define ['underscore', 'zepto', 'backbone', 'backbone_store', 'cs!api', 'cs!models/venue'], (_, $, Backbone, Store, API, Venue) ->
  'use strict'

  VenuesCollection = Backbone.Collection.extend
    model: Venue
    offlineStore: new Store 'Venues'

    # Get a venue (or venues) by its ID. Will make a request to the Foursquare
    # API if the user is not available in the local datastore.
    get: (id) ->
      d = $.Deferred()

      results = @where {id: id}

      if results.length
        d.resolve(results[0])
        return d.promise()

      # Get information about this venue.
      API.request("venues/#{id}").done (data) =>
        venue = new Venue(data.response.venue)
        @add(venue)
        venue.save()

        d.resolve(venue)
      .fail (xhr, type) ->
        d.reject(xhr.response) # if xhr.status == 400

      d.promise()

    # Return a list of venues from the Foursquare API based on a location.
    # For now, this always makes a request to the Foursquare API, but we should
    # intelligently near with caching geo requests in the future.
    # TODO: Deal with caching of coords and explore/nearby venue requests.
    # The coords object is an HTML5 Geolocation `Coordinates` object. Read more
    # here: https://developer.mozilla.org/en-US/docs/Web/API/Coordinates
    near: (coords, section = null) ->
      options = _.extend(coords, {
        sortByDistance: 1
        venuePhotos: 1
      })
      options.section = section if section

      # Search for venues nearby.
      API.request "venues/explore",
        data: options

  return VenuesCollection
