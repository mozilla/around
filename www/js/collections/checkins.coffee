define ['underscore', 'zepto', 'backbone', 'backbone_store', 'localforage', 'cs!api', 'cs!models/checkin'], (_, $, Backbone, Store, localForage, API, Checkin) ->
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
      $.when(API.request "checkins/#{id}").done (data) ->
        checkin = self.create(data.response.checkin)
        checkin.save()

        callbacks.success(checkin) if callbacks.success
      .fail (xhr, type) ->
        if xhr.status == 400
          # Checkin doesn't exist if 400 error code.
          callbacks.error(xhr.response) if callbacks.error

    recent: (args) ->
      self = this

      checkins = @where {_isInRecent: true}

      args.success(checkins) if args.success

      # Check to see if we've made a request to the "recent" API endpoint in
      # the past hour.
      localForage.getItem "lastUpdatedTimestamp-checkins/recent", (lastUpdatedTimestamp) ->
        # Unless we are more than an hour out-of-date or this method was told
        # to force an update, we won't make another API call.
        if !lastUpdatedTimestamp or lastUpdatedTimestamp > window.timestamp() + window.HOUR or args.force
          API.request "checkins/recent",
            data:
              afterTimestamp: lastUpdatedTimestamp or '1'
            success: (data) ->
              localForage.setItem "lastUpdatedTimestamp-checkins/recent", window.timestamp(), ->
                data.response.recent.forEach (c) ->
                  c._isInRecent = true
                  checkin = self.create(c)
                  checkin.save()
                  checkins.push(checkin)

                args.success(checkins) if args.success
            error: (xhr, type) ->
              if xhr.status == 400
                # Checkin doesn't exist if 400 error code.
                args.error(xhr.response) if args.error

  return new CheckinCollection()
