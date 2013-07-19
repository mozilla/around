###!
 around | https:#github.com/tofumatt/around

 HTML5 Foursquare Client
###

# Require.js shortcuts to our libraries.
require.config
  paths:
    async_storage: 'lib/async_storage'
    backbone: 'lib/backbone'
    localstorage: 'lib/backbone.localstorage'
    jed: 'lib/jed'
    tpl: 'lib/tpl'
    underscore: 'lib/lodash'
    zepto: 'lib/zepto'
  # The shim config allows us to configure dependencies for scripts that do
  # not call define() to register a module.
  shim:
    backbone:
      deps: ['underscore', 'zepto']
      exports: 'Backbone'
    underscore:
      exports: '_'
    zepto:
      exports: 'Zepto'

require ['zepto', 'jed', 'routes'], ($, Jed, Routes, require) ->
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
