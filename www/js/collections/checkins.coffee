define ['underscore', 'backbone', 'localstorage', 'cs!api', 'cs!models/checkin'], (_, Backbone, Store, API, Checkin) ->
  'use strict'

  CheckinCollection = Backbone.Collection.extend
    localStorage: new Store 'Checkins'
    model: Checkin

    # Get a checkin based on Foursquare ID. Will make a request to the
    # Foursquare API if this checkin is not available in the local datastore.
    get: (id, callbacks = {}) ->
      results = @where {id: id}
      return callbacks.success(results[0]) if results.length and callbacks.success

      self = this

      # Get information about this checkin.
      API.request "checkins/#{id}",
        success: (data) ->
          checkin = self.create(data.response.checkin)
          checkin.save()

          callbacks.success(checkin) if callbacks.success
        error: (xhr, type) ->
          if xhr.status == 400
            # Checkin doesn't exist if 400 error code.
            callbacks.error(xhr.response) if callbacks.error

  return new CheckinCollection()
