define ['zepto', 'jed', 'localforage', 'deferred', 'cs!globals', 'cs!routes', 'cs!collections/checkins', 'cs!collections/tips', 'cs!collections/users', 'cs!collections/venues'], ($, Jed, localForage, Deferred, GLOBALS, Routes, CheckinCollection, TipCollection, UserCollection, VenueCollection) ->
  'use strict'

  # Set some browser/device classes so we can add specific bits of "feel" to
  # certain engines/devices/etc.
  $('body').addClass 'native-scroll' if window.GLOBALS.HAS.nativeScroll

  if "geolocation" in window.navigator
    return alert "No geolocation available. Sorry; app won't work for now!"

  # Initialize our global collections, where we fetch/store models.
  window.GLOBALS.Checkins = Checkins = new CheckinCollection()
  window.GLOBALS.Tips = Tips = new TipCollection()
  window.GLOBALS.Users = Users = new UserCollection()
  window.GLOBALS.Venues = Venues = new VenueCollection()

  # Fire it up!
  $.when(localForage.getItem('_ACCESS_TOKEN').then (token) ->
    window.GLOBALS.TOKEN = token
  ).then(window.setLanguage).done ->
    # Preload all of our main collections.
    # TODO: Putting this in the early deferred chain causes bugs. Find out why.
    $.when(Checkins.fetch(), Tips.fetch(), Users.fetch(), Venues.fetch()).done ->
      # Load the router; we're off to the races!
      router = new Routes()
      window.router = router

      Backbone.history.start()
