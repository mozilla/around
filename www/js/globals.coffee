define ['zepto', 'localforage', 'moment'], ($, localForage, moment, UserCollection) ->
  mapID = "tofumatt.map-tdyvgkb6"
  # mapID = "mozilla-webprod.g7in06ib"

  # Globals used throughout the app, accessible via window.GLOBALS.
  window.GLOBALS = GLOBALS =
    API_DATE: "20130901" # https://developer.foursquare.com/overview/versioning
    API_URL: "https://api.foursquare.com/v2/"
    AUTH_URL: ""
    CLIENT_ID: "Y50ARQDQNJGI2JU3SPTI1MVEM3OZJ1H120H3UXCQVMAI05OJ"
    DATABASE_NAME: "around"
    HAS:
      nativeScroll: (->
        "WebkitOverflowScrolling" in window.document.createElement("div").style
      )()
    HOUR: 3600
    LANGUAGE: window.navigator.language # HACK: Better way for this, I assume?
    MAP_ID: mapID
    MAP_URL: "http://a.tiles.mapbox.com/v3/#{mapID}/"
    MAX_DOWNLOADS: 2 # Maximum number of podcast downloads at one time.
    MINUTE: 60
    RECENT_CHECKIN_TIME: 120 # Consider checkins less than two hours old to still be good (i.e. the user is still at that venue). TODO: Tweak this for venue type.
    OBJECT_STORE_NAME: "around"
    TOKEN: undefined # Set in app.coffee
  GLOBALS.AUTH_URL = "https://foursquare.com/oauth2/authenticate?client_id=#{GLOBALS.CLIENT_ID}&response_type=token&redirect_uri=#{window.location.origin}"

  # We want the moment library available everywhere, especially inside
  # templates.
  window.moment = moment

  # Format a time in seconds to a pretty 5:22:75 style time. Cribbed from
  # the Gaia Music app.
  window.formatTime = formatTime = (secs) ->
    return "--:--" if isNaN(secs)

    hours = parseInt(secs / 3600, 10) % 24
    hours = if hours != 0 then "#{hours}:" else ""
    minutes = parseInt(secs / 60, 10) % 60
    minutes = if minutes < 10 then "0#{minutes}" else minutes
    seconds = parseInt(secs % 60, 10)
    seconds = if seconds < 10 then "0#{seconds}" else seconds

    "#{hours}#{minutes}:#{seconds}"

  # Return gettext-style strings as they were supplied. An easy way to mock
  # out gettext calls, in case no locale data is available.
  mockL10n = ->
    window._l10n = null
    window.l = (key) ->
      key

  # Set the language of the app and retrieve the proper localization files.
  # This could be improved, but for now works fine.
  window.setLanguage = setLanguage = ->
    d = $.Deferred()
    request = new window.XMLHttpRequest()

    request.open "GET", "locale/#{GLOBALS.LANGUAGE}.json", true

    request.addEventListener "load", (event) ->
      if request.status is 200
        # Alias _ for gettext-style l10n jazz.
        l10n = new Jed(
          locale_data: JSON.parse(request.response)
        )

        # TODO: This seems a bit hacky; maybe we can do better?
        window._l10n = l10n
        window.l = (key) ->
          l10n.gettext(key)

        # Localize any data not rendered by EJS templates, eg. stuff
        # in index.html (currently just the <title> tag).
        # TODO: Allow our localization files to pickup on these
        # attributes, which currently we just get lucky with as they
        # are found elsewhere.
        $("[data-l10n]").each ->
          $(this).text(window.l($(this).data("l10n")))
      else
        mockL10n()

      d.resolve()

    try
      request.send();
    catch error
      console.log(error)
      mockL10n()

    d.promise()

  # Return a timestamp from a JavaScript Date object. If no argument is
  # supplied, return the timestamp for "right now".
  window.timestamp = timestamp = (date = new Date()) ->
    Math.round(date.getTime() / 1000)

  GLOBALS
