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

      unless !results.length or results[0].isOutdated() or !results[0].isFullObject or forceUpdate
        d.resolve(results[0])
        return d.promise()

      # Get information about this venue.
      API.request("venues/#{id}").done (data) =>
        data.response.venue.photos = @_setPhotos(data.response.venue.photos.groups)

        venue = new Venue(data.response.venue)
        venue.isFullObject = true
        venue.lastUpdated = window.timestamp()

        @add(venue, {merge: true})
        venue.save()

        d.resolve(venue)

        # Get more photos if any are available.
        return unless venue.photos.length >= Venue.PHOTOS_RETURNED_FROM_GET_CALL

        # Get all photos for this venue.
        venue.getPhotos().done ->
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
      d = $.Deferred()

      options = _.extend(coords, {
        sortByDistance: 1
        venuePhotos: 1
      })
      options.section = section if section

      # Search for venues nearby.
      request = API.request "venues/explore",
        data: options
      .done (data) =>
        venues = []
        _(data.response.groups[0].items).each (item) =>
          item.venue.photos = @_setPhotos(item.venue.photos.groups)

          venue = new Venue(item.venue)
          venue.lastUpdated = window.timestamp()

          @add(venue)
          venue.save()

          venues.push(venue)

        d.resolve(venues, data)
      .fail(d.reject)

      # Merge in the AJAX request so we can abort it if needed!
      _.merge(d.promise(), {_request: request})

    # Search for venues.
    search: (searchArgs = {}) ->
      d = $.Deferred()

      request = API.request "venues/search",
        data: searchArgs
      .done (data) =>
        if data.response.venues and data.response.venues.length
          venues = []
          _(data.response.venues).each (venue) =>
            if venue.photos
              venue.photos = @_setPhotos(venue.photos.groups)

            venue = new Venue(venue)
            venue.lastUpdated = window.timestamp()

            @add(venue)
            venue.save()

            venues.push(venue)

          d.resolve(venues, data)
        else
          d.resolve([])

      # Merge in the AJAX request so we can abort it if needed!
      _.merge(d.promise(), {_request: request})

    _setPhotos: (photos) ->
      # We move the photos object around because we want to save it as an
      # array.
      photoGroup = _.filter photos, (group) ->
        group.type is "venue"
      if photoGroup[0] then photoGroup[0].items else []

  return VenuesCollection
