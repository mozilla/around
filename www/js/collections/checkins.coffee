define ['underscore', 'zepto', 'backbone', 'backbone_store', 'cs!lib/geo', 'localforage', 'cs!lib/api', 'cs!models/checkin'], (_, $, Backbone, Store, Geo, localForage, API, Checkin) ->
  'use strict'

  CheckinCollection = Backbone.Collection.extend
    model: Checkin
    offlineStore: new Store 'Checkins'

    # Sort all checkins based on their creation date.
    comparator: (checkin) ->
      -checkin.createdAt.getTime()

    # Get a checkin based on Foursquare ID. Will make a request to the
    # Foursquare API if this checkin is not available in the local datastore.
    get: (id) ->
      d = $.Deferred()

      results = @where {id: id}

      if (results.length and
          results[0].lastUpdated + (window.GLOBALS.HOUR * 12) > window.timestamp() and
          results[0].isFullObject and
          !forceUpdate)
        d.resolve(results[0])
        return d.promise()

      # Get information about this checkin.
      API.request("checkins/#{id}").done (data) =>
        checkin = new Checkin(data.response.checkin)
        checkin.isFullObject = true
        checkin.lastUpdated = window.timestamp()

        @add(checkin, {merge: true})
        checkin.save()

        d.resolve(checkin)
      .fail (xhr, type) ->
        # Checkin doesn't exist if 400 error code.
        # TODO: Resolve with a null object if request succeeds but no object
        # is found in Foursquare's DB.
        d.reject(xhr) # if xhr.status == 400

      d.promise()

    recent: (forceUpdate = false) ->
      d = $.Deferred()
      checkins = @where {isFromFriend: true}

      # Check to see if we've made a request to the "recent" API endpoint in
      # the past hour.
      localForage.getItem "lastUpdatedTimestamp-checkins/recent", (lastUpdatedTimestamp) =>
        # Unless we are more than an hour out-of-date or this method was told
        # to force an update, we won't make another API call.
        if !lastUpdatedTimestamp or lastUpdatedTimestamp + window.GLOBALS.HOUR < window.timestamp() or forceUpdate
          # Save the current time so we don't update for another hour.
          localForage.setItem "lastUpdatedTimestamp-checkins/recent", window.timestamp()

          API.request "checkins/recent",
            data:
              afterTimestamp: lastUpdatedTimestamp or '1'
          .done (data) =>
            data.response.recent.forEach (c) =>
              checkin = new Checkin(c)
              checkin.isFromFriend = true
              checkin.isFullObject = true

              @add(checkin, {merge: true})
              checkin.save()

              window.GLOBALS.Users.get(checkin.user.id)
              window.GLOBALS.Venues.get(checkin.venue.id)

            checkins = @where {isFromFriend: true}

            d.resolve(@_onePerUser(checkins))
          .fail d.reject
        else
          d.resolve(@_onePerUser(checkins))

      d.promise()

    _onePerUser: (collection) ->
      users = []
      _.filter collection, (model) ->
        if _.contains(users, model.user.id)
          false
        else
          users.push model.user.id
          true

  return CheckinCollection
