# Check-in Model
# ==============
define ['backbone'], (Backbone) ->
  'use strict'

  Checkin = Backbone.Model.extend
    defaults:
      _createdAt: null
      _updatedAt: null

  return Checkin
