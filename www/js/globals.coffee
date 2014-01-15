define ['zepto', 'localforage', 'moment'], ($, localForage, moment, UserCollection) ->
  mapID = "tofumatt.map-tdyvgkb6"
  # mapID = "mozilla-webprod.g7in06ib"

  # Globals used throughout the app, accessible via window.GLOBALS.
  window.GLOBALS = GLOBALS =
    API_DATE: "20130901" # https://developer.foursquare.com/overview/versioning
    API_URL: "https://api.foursquare.com/v2/"
    AUTH_URL: ""
    CHARACTERS_FOR_AUTOCOMPLETE: 2
    CLIENT_ID: "Y50ARQDQNJGI2JU3SPTI1MVEM3OZJ1H120H3UXCQVMAI05OJ"
    DATABASE_NAME: "around"
    DEFAULT_MAP_MARKER: "pin-m+0095dd"
    HAS:
      nativeScroll: (->
        "WebkitOverflowScrolling" in window.document.createElement("div").style
      )()
    HOUR: 3600
    # These are the officially supported locales for around. If the user's UA
    # returns a separate locale (or one that doesn't fallback to one like en-ca
    # might fallback to en-us), the "default" locale (of en-US) will be used.
    LOCALES: [
      'en-GB'
      'en-US'
    ]
    MAP_ID: mapID
    MAP_URL: "http://a.tiles.mapbox.com/v3/#{mapID}/"
    MAX_DOWNLOADS: 2 # Maximum number of podcast downloads at one time.
    MINUTE: 60
    RECENT_CHECKIN_TIME: 120 # Consider checkins less than two hours old to still be good (i.e. the user is still at that venue). TODO: Tweak this for venue type.
    REDIRECT_URL: "#{window.location.protocol}//#{window.location.host}#{window.location.pathname}" # This needs to be registered as an authorized redirect URI in this app's settings on http://developer.foursquare.com
    OBJECT_STORE_NAME: "around"
    SEARCH_NUMBER_VENUES_WITH_PHOTO: 6 # Number of venues to get photos for when searching
    TOKEN: undefined # Set in app.coffee
  GLOBALS.AUTH_URL = "https://foursquare.com/oauth2/authenticate?client_id=#{GLOBALS.CLIENT_ID}&response_type=token&redirect_uri=#{GLOBALS.REDIRECT_URL}"

  # Determine the locale; fallback to en-US if not available.
  # HACK: Better way for this, I assume?
  GLOBALS.LANGUAGE = window.navigator.language
  GLOBALS.LANGUAGE = 'en-US' unless _.contains GLOBALS.LOCALES, GLOBALS.LANGUAGE

  # We want the moment library available everywhere, especially inside
  # templates.
  window.moment = moment

  # Display a distance in metres in the local distance unit (i.e. imperial or
  # metric) as well as use metres, kilometres, etc. based on distance.
  window.distance = distance = (length, imperial = false) ->
    # TODO: Implement locale check or setting to use imperial units.
    if imperial
      # Metre to mile conversion.
      length = length * 0.00062137

      if length < 11
        length = length.toFixed(1)
      else
        length = Math.round(length)

      return "#{length} mile#{if length is 1 then '' else 's'}"

    # If we aren't using imperial units, decide whether or not to show metres
    # or kilometres.
    if length > 200
      length = length / 1000
      # Show a decimal point unless the venue is 11km or more away.
      if length < 11
        length = length.toFixed(1)

      return "#{length} km"
    else
      return "#{length} m"

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
