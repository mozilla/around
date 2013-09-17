'use strict';

/*!
 around | https://github.com/tofumatt/around

 HTML5 Foursquare Client
*/

// Require.js shortcuts to our libraries.
require.config({
    paths: {
        async_storage: 'lib/async_storage',
        backbone: 'lib/backbone',
        brick: 'lib/brick',
        'coffee-script': 'lib/coffee-script',
        cs: 'lib/cs',
        localstorage: 'lib/backbone.localstorage',
        jed: 'lib/jed',
        tpl: 'lib/tpl',
        underscore: 'lib/lodash',
        zepto: 'lib/zepto'
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
            exports: 'Brick'
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
