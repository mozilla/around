define ['zepto', 'jed', 'cs!globals', 'cs!routes', 'cs!collections/venues'], ($, Jed, GLOBALS, Routes, Venues) ->
  'use strict'

  # Load up our locale files, then actually start loading routes/views.
  if window.GLOBALS.HAS.nativeScroll
    $('body').addClass 'native-scroll'

  # Fire it up!
  window.setLanguage ->
    # Awful cascade of callbacks to make sure we have all data available.
    Venues.fetch
      success: ->
        # Load the router; we're off to the races!
        router = new Routes()
        window.router = router

        Backbone.history.start()
