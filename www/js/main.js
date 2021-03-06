/* global require:true */
/*!
 around | https://github.com/tofumatt/around

 HTML5 Foursquare Client
*/

// Require.js shortcuts to our libraries.
require.config({
    paths: {
        'backbone': 'vendor/backbone',
        'backbone_promises': 'vendor/backbone.promises',
        'backbone_routefilter': 'vendor/backbone.routefilter',
        'backbone_store': 'vendor/backbone.localforage',
        'brick': 'vendor/brick-0.10.0',
        'coffee-script': 'vendor/coffee-script',
        'cs': 'vendor/cs',
        'deferred': 'vendor/deferred',
        'human_model': 'vendor/human-model',
        'jed': 'vendor/jed',
        'localforage': 'vendor/localforage',
        'moment': 'vendor/moment',
        'tpl': 'vendor/tpl',
        'underscore': 'vendor/lodash',
        'zepto': 'vendor/zepto'
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
        backbone_routefilter: {
            deps: [
                'backbone'
            ]
        },
        brick: {
            exports: 'xtag'
        },
        deferred: {
            deps: [
                'zepto'
            ],
            exports: 'deferred'
        },
        localforage: {
            exports: 'localForage'
        },
        human_model: {
            deps: [
                'backbone'
            ],
            exports: 'HumanModel'
        },
        moment: {
            exports: 'moment'
        },
        underscore: {
            exports: '_'
        },
        zepto: {
            exports: 'Zepto'
        }
    }
});

require(['underscore', 'backbone_promises', 'cs!globals', 'cs!app']);
