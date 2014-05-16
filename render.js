#!/usr/bin/env node

// Configure and run the rendering server, use node render --help to view command line options, or
// change the cfg.json file
var prerenderServer = require('./lib/config').getPrerenderServer(undefined);

prerenderServer.start();













