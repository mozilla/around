define ['zepto', 'jed', 'cs!globals', 'cs!routes'], ($, Jed, GLOBALS, Routes) ->
  'use strict'

  # Load up our locale files, then actually start loading routes/views.
  if window.GLOBALS.HAS.nativeScroll
    $('body').addClass 'native-scroll'

  # Fire it up!
  window.setLanguage ->
    # Load the router; we're off to the races!
    router = new Routes()
    window.router = router

    Backbone.history.start()
