require ['zepto', 'jed', 'cs!routes'], ($, Jed, Routes, require) ->
  'use strict'

  # Load our globals and attach stuff to window.
  require 'globals'

  # Load up our locale files, then actually start loading routes/views.
  if GLOBALS.HAS.nativeScroll
    $('body').addClass 'native-scroll'

  # Fire it up!
  setLanguage ->
    # Load the router; we're off to the races!
    router = new Routes()
    window.router = router

    Backbone.history.start()
