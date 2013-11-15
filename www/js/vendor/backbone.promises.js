// Mixin for Backbone.js that extends its Collection (and, in the future,
// Model) class to return jQuery/Zepto-compatible promise objects for any
// operation that includes asynchronous operation. Still allows for callbacks,
// so it doesn't break compatibility with Backbone/other libraries.
define(['zepto', 'underscore', 'backbone'], function($, _, Backbone) {
    'use strict';

    var collectionMethods = Backbone.Collection.prototype;
    Backbone.Collection = Backbone.Collection.extend({
        create: function(model, options) {
            var d = $.Deferred();

            if (!options) {
                options = {};
            }

            var errorCallback = options.error;
            var successCallback = options.success;
            options.success = function() {
                if (successCallback) {
                    successCallback(arguments);
                }
                d.resolve(arguments);
            };
            options.error = function() {
                if (errorCallback) {
                    errorCallback(arguments);
                }
                d.reject(arguments);
            };

            collectionMethods.create.call(this, model, options);

            return d.promise();
        },

        fetch: function(options) {
            var d = $.Deferred();

            if (!options) {
                options = {};
            }

            var errorCallback = options.error;
            var successCallback = options.success;
            options.success = function() {
                if (successCallback) {
                    successCallback(arguments);
                }
                d.resolve(arguments);
            };
            options.error = function() {
                if (errorCallback) {
                    errorCallback(arguments);
                }
                d.reject(arguments);
            };

            collectionMethods.fetch.call(this, options);

            return d.promise();
        }
    });
});
