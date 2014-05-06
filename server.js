#!/usr/bin/env node

// This will load a default config, then merge in config json file, and finally use any command line
// configuration options
var options = require( './lib/config' )(process.argv);

// Load up the prerender phantomJS service using our options
var prerender = require('prerender');
var server    = prerender(options);

// All the plugins we will allow
var plugins = {
    basicAuth         : prerender.basicAuth(),
    whitelist         : prerender.whitelist(),
    blacklist         : prerender.blacklist(),
    logger            : prerender.logger(),
    removeScriptTags  : prerender.removeScriptTags(),
    httpHeaders       : prerender.httpHeaders(),
    inMemoryHtmlCache : prerender.inMemoryHtmlCache(),
    s3HtmlCache       : prerender.s3HtmlCache()
};



// Add the plugins we want added using the default config, config.json, or command lines
options.plugins.forEach(function(key){
    if (key in plugins) {
        plugins[key];
    }
})

// Finally start up the server that will handle prerendering the seo snapshots
server.start();


