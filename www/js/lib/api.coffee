# This is our compact Foursquare API library. It makes requests to the
# Foursquare API using the currently signed-in user's API token and handles
# any specialities in the Foursquare API. Uses the v2 Foursquare API (for now,
# as defined in globals.coffee).
#
# Expected usage would be to require() the library as such:
#
#    API = require 'api'
#    API.request 'venues/explore',
#      data:
#        lat: 45
#        lng: 34
#      success: (response) ->
#        alert(response)
define ['zepto'], ($) ->
  # Used across the app to make a request to the Foursquare API with the
  # current user's credentials. The first argument is the URL of the API
  # endpoint after the version in the URL. eg: request('venues/explore')
  # will make a request to https://api.foursquare.com/v2/venues/explore,
  # including the required OAuth and version arguments.
  # All requests are sent over HTTPS.
  request = (url, args = {}) ->
    data = {
      oauth_token: window.GLOBALS.TOKEN
      v: window.GLOBALS.API_DATE
    }

    _.extend data, args.data if args.data

    # Get information about this user.
    $.ajax
      type: args.requestMethod || "GET"
      data: data
      dataType: 'json'
      url: "#{window.GLOBALS.API_URL}#{url}"
      success: args.success || defaultSuccessHandler
      error: args.error || defaultErrorHander

  # The default error handler for requests to Foursquare that don't define
  # their own error handler. Simply spits out raw error information.
  defaultErrorHander = (xhr, errorType, error) ->
    console.error "Foursquare API Error", xhr, errorType, error

  # The default success handler for requests to Foursquare that don't define
  # their own success handler. Outputs the request to the console with INFO
  # level. This will always be called when using promises.
  defaultSuccessHandler = (response) ->
    console.info "Foursquare API Response", response

  return {
    request: request
  }
