# Check-in Model
# ==============
define ['backbone'], (Backbone) ->
  'use strict'

  Checkin = Backbone.Model.extend
    defaults:
      userId: null

      _isInRecent: false

      _createdAt: null
      _updatedAt: null

  return Checkin
