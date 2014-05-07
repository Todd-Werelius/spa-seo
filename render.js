#!/usr/bin/env node

// This will load a default config, then merge in config json file, and finally use any command line
// configuration options

var cfg       = require('./lib/config')(process.argv);
var prerender = require('prerender');
var plugins   = {
    basicAuth         : prerender.basicAuth(),
    whitelist         : prerender.whitelist(),
    blacklist         : prerender.blacklist(),
    logger            : prerender.logger(),
    removeScriptTags  : prerender.removeScriptTags(),
    httpHeaders       : prerender.httpHeaders(),
    inMemoryHtmlCache : prerender.inMemoryHtmlCache(),
    s3HtmlCache       : prerender.s3HtmlCache()
};


// Override prerender prodess.env variables if present
cfg.env.forEach(function(item){
    if ( item.set ) {
        //console.log("Overriding process.env." + key + " : " + process.env[item.key] + " to " + item.value);
        process.env[item.key] = item.value;
    }
});

// Turn on sny requested and available plugins
Object.keys(cfg.plugins).forEach(function(key) {
    if (key in plugins) {
        if (cfg.plugins[key]) {
            plugins[key];
            //console.log("Loaded prerender plugin : "+key);
        }
    } else {
        console.log("Prerender plugin " + key + " was requested but is not recognized");
    }
});

// Finally start up the prerender server to handle rendering the seo pages
// Initialize the prerender phantomJS service using our options
// gathered from the cfg module
prerender(cfg.options).start();
//engine.start();







