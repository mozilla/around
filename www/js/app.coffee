define ['zepto', 'jed', 'localforage', 'cs!globals', 'cs!routes', 'cs!collections/venues'], ($, Jed, localForage, GLOBALS, Routes, Venues) ->
  'use strict'

  # Load up our locale files, then actually start loading routes/views.
  if window.GLOBALS.HAS.nativeScroll
    $('body').addClass 'native-scroll'

  if "geolocation" in window.navigator
    return alert "No geolocation available. Sorry; app won't work for now!"

  # Fire it up!
  localForage.getItem '_ACCESS_TOKEN', (token) ->
    window.GLOBALS.TOKEN = token

    window.setLanguage ->
      # Awful cascade of callbacks to make sure we have all data available.
      Venues.fetch
        success: ->
          # Load the router; we're off to the races!
          router = new Routes()
          window.router = router

          Backbone.history.start()
