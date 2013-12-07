define ['underscore', 'zepto', 'backbone', 'backbone_store', 'localforage', 'cs!lib/api', 'cs!models/tip'], (_, $, Backbone, Store, localForage, API, Tip) ->
  'use strict'

  TipCollection = Backbone.Collection.extend
    model: Tip
    offlineStore: new Store 'Tips'

    # Get all tips for a venue based on its ID.
    getForVenue: (venue) ->
      d = $.Deferred()

      results = @where {_venueID: venue.id || venue}

      if results.length
        d.resolve(results)
        return d.promise()

      # Get information about this checkin.
      API.request("venues/#{venue.id || venue}/tips").done (data) =>
        tips = []
        for tip in data.response.tips.items
          tip = new Tip(tip)

          tip.isFullObject = true
          tip.lastUpdated = window.timestamp()
          tip._venueID = venue.id || venue

          @add(tip, {merge: true})
          tip.save()

          tips.push(tip)

        d.resolve(tips)
      .fail (xhr, type) ->
        # Checkin doesn't exist if 400 error code.
        # TODO: Resolve with a null object if request succeeds but no object
        # is found in Foursquare's DB.
        d.reject(xhr) # if xhr.status == 400

      d.promise()

  return TipCollection
