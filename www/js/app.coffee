define ['zepto', 'jed', 'localforage', 'deferred', 'cs!globals', 'cs!routes', 'cs!collections/checkins', 'cs!collections/users', 'cs!collections/venues'], ($, Jed, localForage, Deferred, GLOBALS, Routes, Checkins, Users, Venues) ->
  'use strict'

  # Set some browser/device classes so we can add specific bits of "feel" to
  # certain engines/devices/etc.
  $('body').addClass 'native-scroll' if window.GLOBALS.HAS.nativeScroll

  if "geolocation" in window.navigator
    return alert "No geolocation available. Sorry; app won't work for now!"

  # Prep all Backbone.js collections so the app can load data out of them.
  # For now this is a big hack, but I'll explore improving the collections and
  # models in the app (including using Human Models for Backbone) in the future.
  prepCollections = ->
    d = $.Deferred()

    unless window.GLOBALS.TOKEN
      d.resolve()
      return d.promise()

    # I hate myself and want to die.
    Checkins.fetch
      success: ->
        Users.fetch
          success: ->
            Venues.fetch
              success: d.resolve

    return d.promise()

  # Fire it up!
  $.when(localForage.getItem('_ACCESS_TOKEN').then (token) ->
    window.GLOBALS.TOKEN = token
  ).then(window.setLanguage).then(prepCollections).done ->
    # Load the router; we're off to the races!
    router = new Routes()
    window.router = router

    Backbone.history.start()
