define ['zepto'], ($) ->
  # API Helper method.
  request = (url, callbacks = {}, requestMethod = "GET") ->
    # Get information about this user.
    $.ajax
      type: requestMethod
      dataType: 'json'
      # TODO: Set our access_token as a global? Roll this into a helper function?
      url: "#{window.GLOBALS.API_URL}#{url}?oauth_token=#{window.GLOBALS.TOKEN}&v=#{window.GLOBALS.API_DATE}"
      success: callbacks.success
      error: callbacks.error

  return {request: request}
