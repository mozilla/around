'use strict';

/*!
 around | https://github.com/tofumatt/around

 HTML5 Foursquare Client
*/

// Require.js shortcuts to our libraries.
require.config({
    paths: {
        api: 'lib/api',
        async_storage: 'vendor/async_storage',
        backbone: 'vendor/backbone',
        brick: 'vendor/brick',
        'coffee-script': 'vendor/coffee-script',
        cs: 'vendor/cs',
        localstorage: 'vendor/backbone.localstorage',
        jed: 'vendor/jed',
        map: 'vendor/mapbox',
        tpl: 'vendor/tpl',
        underscore: 'vendor/lodash',
        zepto: 'vendor/zepto'
    },
    // The shim config allows us to configure dependencies for scripts that do
    // not call define() to register a module.
    shim: {
        backbone: {
            deps: [
                'underscore',
                'zepto'
            ],
            exports: 'Backbone'
        },
        brick: {
            exports: 'xtag'
        },
        map: {
            exports: 'L'
        },
        underscore: {
            exports: '_'
        },
        zepto: {
            exports: 'Zepto'
        }
    }
});

require(['cs!app']);
