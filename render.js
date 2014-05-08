#!/usr/bin/env node

var helper       = require('./lib/config')              // Helper functions to setup prerender
var cfg          = helper.getConfig();                  // Created a cfg object from defaults, .json cfg, or command line flags
var renderServer = helper.getPrerenderServer( cfg );    // Returns a ready to run rendering server

renderServer.start();












