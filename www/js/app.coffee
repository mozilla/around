define ['zepto', 'jed', 'localforage', 'cs!globals', 'cs!routes', 'cs!collections/checkins', 'cs!collections/users', 'cs!collections/venues'], ($, Jed, localForage, GLOBALS, Routes, Checkins, Users, Venues) ->
  'use strict'

  # Set some browser/device classes so we can add specific bits of "feel" to
  # certain engines/devices/etc.
  $('body').addClass 'native-scroll' if window.GLOBALS.HAS.nativeScroll

  if "geolocation" in window.navigator
    return alert "No geolocation available. Sorry; app won't work for now!"

  # Fire it up!
  localForage.getItem '_ACCESS_TOKEN', (token) ->
    window.GLOBALS.TOKEN = token

    window.setLanguage ->
      # Awful cascade of callbacks to make sure we have all data available.
      Checkins.fetch
        success: ->
          Users.fetch
            success: ->
              Venues.fetch
                success: ->
                  # Load the router; we're off to the races!
                  router = new Routes()
                  window.router = router

                  Backbone.history.start()
