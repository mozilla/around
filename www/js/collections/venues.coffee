define ['underscore', 'zepto', 'backbone', 'backbone_store', 'cs!lib/api', 'cs!models/venue'], (_, $, Backbone, Store, API, Venue) ->
  'use strict'

  VenuesCollection = Backbone.Collection.extend
    model: Venue
    offlineStore: new Store 'Venues'

    # Get a venue (or venues) by its ID. Will make a request to the Foursquare
    # API if the user is not available in the local datastore.
    get: (id, forceUpdate = false) ->
      d = $.Deferred()

      results = @where {id: id}

      if results.length and results[0]._lastUpdated + (window.GLOBALS.HOUR * 12) > window.timestamp() and !forceUpdate
        d.resolve(results[0])
        return d.promise()

      # Get information about this venue.
      API.request("venues/#{id}").done (data) =>
        # We move the photos object around because we want to save it as an
        # array.
        photoGroup = _.filter data.response.venue.photos.groups, (group) ->
          group.type is "venue"
        data.response.venue.photos = if photoGroup[0] then photoGroup[0].items else []

        venue = new Venue(data.response.venue)
        venue._lastUpdated = window.timestamp()

        @add(venue, {merge: true})
        venue.save()

        d.resolve(venue)

        # Get more photos if any are available.
        return unless venue.photos.length >= Venue.PHOTOS_RETURNED_FROM_GET_CALL

        # Get all photos for this venue.
        # TODO: Get photos past the 200 count.
        API.request("venues/#{id}/photos").done (data) =>
          if data.response.photos and data.response.photos.items
            venue.photos = data.response.photos.items

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
