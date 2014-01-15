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

  # Multiplier for determining what's "nearby".
  GEO_PADDING = 350

  # Amount of time to fallback to an IP-based lat/lng pair (happens on some
  # Firefox OS phones with bad GPS support). In ms, as it's used in a
  # `setTimeout()` call.
  GPS_TIMEOUT = 10000

  # Only make one of these requests at a time, and be able to cancel it.
  _requestToIPService = null
  _requestToIPServiceTimeout = null

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

        unless _requestToIPServiceTimeout
          _requestToIPServiceTimeout = setTimeout ->
            getLocationFromIP().done (position) ->
              _requestToIPService = null
              _requestToIPServiceTimeout = null

              successCallback(position, position.coords, position.coords.accuracy) if successCallback
              d.resolve(position, position.coords, position.coords.accuracy)
          , GPS_TIMEOUT

        window.navigator.geolocation.getCurrentPosition (position) ->
          # First, cancel our AJAX request (and unqueue the timeout).
          clearTimeout _requestToIPServiceTimeout
          _requestToIPServiceTimeout = null
          _requestToIPService.abort() if _requestToIPService

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

  # Request VERY approximate location info from the user's IP address. Used
  # only when GPS requests take a long time.
  getLocationFromIP = ->
    d = $.Deferred()

    # Store the request so we can cancel it later, if needed.
    # We use JSONP because the server doesn't send out CORS headers.
    #
    # TODO: Change this from JSONP to JSON when CORS works.
    console.info "Requesting IP-based lat/lng from freegeoip.net."

    _requestToIPService = $.ajax
      type: "GET"
      dataType: 'jsonp'
      url: "https://freegeoip.net/json/?callback=?"
    .done (response) ->
      position =
        coords:
          accuracy: null
          lat: response.latitude
          latitude: response.latitude
          lng: response.longitude
          longitude: response.longitude
        lastUpdated: window.timestamp()
        timestamp: window.timestamp()

      d.resolve(position)

      requestToIPService = null
    .fail d.reject

    d.promise()

  # Filters a collection of objects based on their proximity to a location (by
  # default, the current location of the user).
  # TODO: Allow a position object to be supplied instead of relying on the
  # user's current location.
  #
  # This method requires _every object in the collection to respond to the
  # `location` property. i.e. `item.location.lat` and `item.location.lng`. If
  # `lat` or `lng` isn't available `latitude` and `longitude` will also be
  # tried. If neither property is found, the object will be excluded.
  #
  # Returns a promise object, as this method requires geolocation and may take
  # some time. If geolocation fails, the promise fails.
  filterNearby = (collection, position = null) ->
    d = $.Deferred()

    getCurrentPosition().done (position) ->
      bounds = L.latLngBounds([
        [position.coords.latitude - 0.0001, position.coords.longitude - 0.0001],
        [position.coords.latitude + 0.0001, position.coords.longitude - 0.0001],
        [position.coords.latitude - 0.0001, position.coords.longitude + 0.0001],
        [position.coords.latitude + 0.0001, position.coords.longitude + 0.0001]        
      ]).pad(GEO_PADDING)

      d.resolve _.filter(collection, (item) ->
        return false unless item.location and (item.location.lat or item.location.latitude) and (item.location.lng or item.location.longitude)

        bounds.contains L.latLng(
          item.location.lat or item.location.latitude,
          item.location.lng or item.location.longitude
        )
      )
    .fail d.reject

    d.promise()

  # Determine whether or not a set of lat/lng coordinates are nearby. Simply
  # returns `true` if a location is considered "local", `false` if not.
  isNearby = (lat, lng) ->
    d = $.Deferred()

    getCurrentPosition().done (position) ->
      bounds = L.latLngBounds([
        [position.coords.latitude - 0.0001, position.coords.longitude - 0.0001],
        [position.coords.latitude + 0.0001, position.coords.longitude - 0.0001],
        [position.coords.latitude - 0.0001, position.coords.longitude + 0.0001],
        [position.coords.latitude + 0.0001, position.coords.longitude + 0.0001]        
      ]).pad(GEO_PADDING)

      d.resolve bounds.contains(L.latLng(lat, lng))

    d.promise()

  # Output a static map image.
  staticMap = (coords = null, pins = [], zoomLevel = 14, size = [$(window).width(), 125]) ->
    return "" unless coords

    pinString = ""
    for pin in pins
      if pin[2] and pin[2].match 'https?:\/\/'
        marker = "url-#{encodeURIComponent(pin[2])}"
      else if pin[2]
        marker = pins[2]
      else
        marker = window.GLOBALS.DEFAULT_MAP_MARKER

      # TODO: Remove this override in the future.
      marker = window.GLOBALS.DEFAULT_MAP_MARKER
      pinString += "#{marker}(#{pin[1]},#{pin[0]})/"

    "#{window.GLOBALS.MAP_URL}#{pinString}#{coords[1]},#{coords[0]},#{zoomLevel}/#{size[0]}x#{size[1]}.png"
  
  return {
    filterNearby: filterNearby
    getCurrentPosition: getCurrentPosition
    isNearby: isNearby
    staticMap: staticMap
  }
