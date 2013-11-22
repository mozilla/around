# Geolocation library. This is a thin wrapper around
# `window.navigator.geolocation.getCurrentPosition` that implements promises
# and does some light, sane caching of geodata. All geolocation calls should be
# made through this API to lessen the amount of time we engage the device's
# GPS or whatever.
define ['zepto', 'localforage'], ($, localForage) ->
  # Amount of time we don't bother with new geo requests.
  CACHE_TIME_NO_UPDATE = 30

  # Amount of time to consider previous geo requests fresh enough to "fill in"
  # while we make another request.
  CACHE_TIME_WITH_UPDATE = window.GLOBALS.MINUTE * 5

  getCurrentPosition = (successCallback, failureCallback, forceUpdate = false) ->
    d = $.Deferred()

    localForage.getItem '_geo_last_getCurrentPosition', (geoCache) ->
      # We use cached geodata for up to five minutes, but we only present the
      # data as if it were up-to-date (without a refresh) for thirty seconds.
      if forceUpdate or !geoCache or geoCache.lastUpdated + CACHE_TIME_NO_UPDATE < window.timestamp()
        console.info "Getting new geodata."

        unless !geoCache or geoCache.lastUpdated + CACHE_TIME_WITH_UPDATE < window.timestamp()
          console.info "Using cached geodata while we update."
          successCallback(geoCache, geoCache.coords, geoCache.coords.accuracy) if successCallback
          d.resolve(geoCache, geoCache.coords, geoCache.coords.accuracy)

        window.navigator.geolocation.getCurrentPosition (position) ->
          # Extend the position object with some shortcuts.
          position.coords.lat = position.coords.latitude
          position.coords.lng = position.coords.longitude

          # We can't clone the Position object, so we do a shallow copy.
          positionCopy = {
            coords: {}
            lastUpdated: window.timestamp()
            timestamp: position.timestamp
          }
          for k, v of position.coords
            positionCopy.coords[k] = v

          localForage.setItem '_geo_last_getCurrentPosition', positionCopy

          successCallback(position, position.coords, position.coords.accuracy) if successCallback
          d.resolve(position, position.coords, position.coords.accuracy)
        , (position) ->
          failureCallback(position, null, null) if failureCallback
          d.reject(position, null, null)
      else
        console.info "Getting cached geodata."
        successCallback(geoCache, geoCache.coords, geoCache.coords.accuracy) if successCallback
        d.resolve(geoCache, geoCache.coords, geoCache.coords.accuracy)

    d.promise()
  
  return {
    getCurrentPosition: getCurrentPosition
  }
