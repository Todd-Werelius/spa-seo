var _         = require('underscore');  // Util Module
var args      = require('commander');   // Command line processing module
var path      = require('path');        // File utility's
var cluster   = require('cluster');     // This is a cluster based server see --help for options
var prerender = require('prerender');


/**
 * Call this function to create and return a configured prerender.io rendering server
 *
 * @param cfg an object that is used to modify the behavior of the prerender service, if no value is
 * passed one is created for you.
 * 
 * @returns {*} The prerender server object for this cluster worker
 */
exports.getPrerenderServer = function getPrerenderServer(cfg) {

    var server;

    cfg = cfg || this.getConfig();

    // The first time you need to modify the environment based on contents of cfg
    if (cluster.isMaster) {
        setPrerenderEnvironment(cfg.env);
        setPluginsEnvironment(cfg.plugins);
    }

    if ((server = prerender(cfg.options))) {
        loadPrerenderPlugins(cfg.plugins);
    }

    return server;
};

/**
 * Configures an object used to control the prerender server
 *
 * The function first constructs a default cfg object containing 3 child objects
 *
 *  options an object that contains prerender properties with default settings used to configure the service
 *
 *  env     an object that contains prerender process.env properties, typically you leave these alone but they
 *          can be used to override prerender defaults ( use with caution )
 *
 *  plugins an object that contains key's that map to prerender middleware, if set to true they will be loaded
 *
 * The function then looks at command line arguments, one of which allows a cfg file to be specified, this
 * file is a json formatted cfg object and if present will be used to add or overwrite objects and properties
 * in the cfg default object
 *
 * Finally the function uses any command line arguments to set final values of the cfg object ( or it's associated
 * child object )
 *
 * The order of precedence is command line arguments override->cfg file which overrides->default properties
 *
 * @returns {{options: {workers: (*|number), phantomBasePort: (*|number), iterations: (*|number), port: (*|number), phantomArguments: string[]}, env: {PAGE_DONE_CHECK_TIMEOUT: {set: boolean, value: (*|number)}, RESOURCE_DOWNLOAD_TIMEOUT: {set: boolean, value: (*|number)}, WAIT_AFTER_LAST_REQUEST: {set: boolean, value: (*|number)}, JS_CHECK_TIMEOUT: {set: boolean, value: (*|number)}, JS_TIMEOUT: {set: boolean, value: (*|number)}, EVALUATE_JAVASCRIPT_CHECK_TIMEOUT: {set: boolean, value: (*|number)}}, plugins: {removeScriptTags: {load: boolean, env: {}}, httpHeaders: {load: boolean, env: {}}, blacklist: {load: boolean, env: {}}, basicAuth: {load: boolean, env: {}}, whitelist: {load: boolean, env: {}}, logger: {load: boolean, env: {}}, inMemoryHtmlCache: {load: boolean, env: {}}, s3HtmlCache: {load: boolean, env: {}}}}}
 */
exports.getConfig = function getConfig() {

    var cfg       = getDefaultCfg(); // Defaults
    var jsn       = emptyObj(cfg);   // .json cfg file
    var cmd       = emptyObj(cfg);   // command line cfg overrides go here and are merged at end of function

    // 1. Load the cmd line args ( if any )
    cmd = getCmdLineArgs(cmd);

    // 2. Load the .json cfg file if present
    jsn = getConfigFile(jsn,args.config);

    // 3. Override cfg defaults with any .json cfg properties
    cfg = cfgOverride(cfg,jsn);

    // 2. override cfg defaults with any command line parameters
    cfg = cfgOverride(cfg,cmd);

    // Return the merged configuration object
    return cfg;
};


// Private Helper functions --------

// Loads a config file if requested
function getConfigFile(jsn,file) {

    try {
        if (file) {
            jsn = require(file);
        }

    } catch(error) {
        console.log("\nThe config file " + file + 'does not exist or is corrupt\n');
        this.help();
    }

    return jsn;
}

// Builds the default configuration options
function getDefaultCfg() {

    return {

        // Standard options you can pass to prerender service
        options : {
            workers         : process.env.PHANTOM_CLUSTER_NUM_WORKERS || 1,     // Max number of workers ( clusters )
            phantomBasePort : process.env.PHANTOM_CLUSTER_BASE_PORT   || 12400, // PhantomJS Server Cluster Starting Port
            iterations      : process.env.PHANTOM_WORKER_ITERATIONS   || 200,   // Calls before phantomJS restarts
            port            : process.env.PORT                        || 3030,  // Port you will send bot requests to

            // Passed directly to phantomjs
            phantomArguments : [

                '--load-images=false',
                '--ignore-ssl-errors=true',
                '--ssl-protocol=tlsv1'
            ]
        },

        // prerender environment variable overrides
        env  : {
            PAGE_DONE_CHECK_TIMEOUT           : { set: false, value : process.env.PAGE_DONE_CHECK_TIMEOUT || 50 },
            RESOURCE_DOWNLOAD_TIMEOUT         : { set: false, value : process.env.RESOURCE_DOWNLOAD_TIMEOUT || 10000},
            WAIT_AFTER_LAST_REQUEST           : { set: false, value : process.env.WAIT_AFTER_LAST_REQUEST || 500},
            JS_CHECK_TIMEOUT                  : { set: false, value : process.env.JS_CHECK_TIMEOUT || 50},
            JS_TIMEOUT                        : { set: false, value : process.env.JS_TIMEOUT || 10000},
            EVALUATE_JAVASCRIPT_CHECK_TIMEOUT : { set: false, value : process.env.EVALUATE_JAVASCRIPT_CHECK_TIMEOUT || 50}
        },

        plugins: {
            "removeScriptTags" : { load : true, env : {

            }},
            "httpHeaders"      : { load : true, env : {

            }},
            "blacklist"        :{ load : true, env :  {

            }},
            "basicAuth"        : { load : false, env : {

            }},
            "whitelist"        : { load : false, env : {

            }},
            "logger"           : { load : false, env : {

            }},
            "inMemoryHtmlCache": { load : false, env : {

            }},
            "s3HtmlCache"      : { load : false, env : {

            }}
        }
    };
}

function getCmdLineArgs(cmd) {

    // Get any command line options that are present
    args
        .version(require('../package.json').version)
        .usage(' [options]')

        // Try to load the config file if the user provided one
        .option('-C , --config [filename]',"a json configuration file located in the root (see cfg.json)",function(value) {
            return path.join(__dirname,'../',value);
        })

        .option('-W , --workers [number]',"Number of CPU's to use : -1 to use all, default 1",function(value){

            cmd.options.workers = checkValueNumber(value,0,128,{msg:"workers must be 0 ( all CPU's ) or a positive number but was : "+value,helpFn:this.help});
            return cmd.options.workers;
        })
        .option('-I , --iterations [number]','Number of requests for restarting phantomJS service, default 200',function(value){
            cmd.options.iterations = checkValueNumber(value,1,500,args,{msg:"iterations must be a number between 1 and 500 but was : "+value,helpFn:this.help});
            return cmd.options.iterations;
        })
        .option('-P , --port [number]','Port this server will listen on, default 3030',function(value){
            cmd.options.port = checkValueNumber(value,3000,64000,args,{msg:"port must be a number between 1000 and 6400 but was : "+value,helpFn:this.help});
            return cmd.options.port;
        })
        .option('-B , --phantomBasePort [number]','Starting port for phantomjs cluster, default 12300',function(value){
            cmd.options.phantomBasePort = checkValueNumber(value,3001,64000,args,{msg:"phantomBasePort must be a number between 1000 and 6400 but was : "+value,helpFn:this.help});
            return cmd.options.phantomBasePort;
        })
        .option('-NS, --removeScriptTags [boolean]' ,"Remove '<script>' blocks after page is rendered, default true",function(value){
            cmd.plugins.removeScriptTags = getSwitch(value);
            return cmd.plugins.removeScriptTags;
        },true)
        .option('-HH, --httpHeaders [boolean]','Load prerender httpHeaders middleware, default true',function(value){
            cmd.plugins.httpHeaders = getSwitch(value);
            return cmd.plugins.httpHeaders;
        },true)
        .option('-BA, --basicAuth [boolean]'        ,'Load prerender basicAuth middleware, default false',function(value){
            cmd.plugins.basicAuth = getSwitch(value);
            return cmd.plugins.basicAuth;
        },true)
        .option('-BL, --blacklist [boolean]'        ,'Load prerender blacklist middleware, default false',function(value){
            cmd.plugins.blacklist = getSwitch(value);
            return cmd.plugins.blacklist;
        },false)
        .option('-WL, --whitelist [boolean]'        ,'Load prerender whitelist middleware, default false',function(value){
            cmd.plugins.whitelist = getSwitch(value);
            return cmd.plugins.whitelist;
        },false)
        .option('-LG, --logger [boolean]'           ,'Load prerender logger middleware, default false',function(value){
            cmd.plugins.logger = getSwitch(value);
            return cmd.plugins.logger;
        },false)
        .option('-MC, --inMemoryHtmlCache [boolean]','Load prerender inMemoryHtmlCache middleware, default false',function(value){
            cmd.plugins.inMemoryHtmlCache = getSwitch(value);
            return cmd.plugins.inMemoryHtmlCache;
        },false)
        .option('-S3, --s3HtmlCache [boolean]'      ,'Load prerender s3HtmlCache middleware, default false',function(value){
            cmd.plugins.s3HtmlCache = getSwitch(value);
            return cmd.plugins.s3HtmlCache;
        },false)
        .parse(process.argv);

    return cmd;
}

function oneTimeMsg(msg) {
    if(!cluster.isMaster) {
        return;
    }
    console.log(msg);
}

function loadPrerenderPlugins( plugins ) {
    // Turn on any requested plugins ( if they exist )
    Object.keys(plugins).forEach( function(key) {

        if (plugins[key].load ) {
            if (key in prerender && _.isFunction( prerender[key]) ) {

                prerender[key]();

                oneTimeMsg("Loaded prerender plugin : " + key);
            } else {
                oneTimeMsg("Prerender plugin " + key + " was requested but is not available");
            }
        }
    });
}

// The prerender service, and the plugins all depend on env variables instead of passed options, this function
// gives us a way to override any defaults set in your environment and only occurs on startup ( the master cluster )
// if you like to use env. vars only then just remove the contents of the env object's
function setPrerenderEnvironment(env) {

    if (!cluster.isMaster) {
        return;
    }

    Object.keys(env).forEach(function(key){
        if ( env[key].set ) {
            oneTimeMsg("Master process.env." + key + " was " + process.env[key] + " but is now " + env[key].value);
            process.env[key] = env[key].value;
        }
    });
}

function setPluginsEnvironment() {

    if (!cluster.isMaster) {
        return 0;
    }
}

// Purpose built extender for cfg objects
function cfgOverride(dest,src) {

    Object.keys(src).forEach(function(key){
        if (!_.isEmpty(src[key])) {
            if (!dest.hasOwnProperty(key)) {
                dest[key] = src[key];
            }
            _.extend(dest[key],src[key]);
        }
    });
    return dest;
}

// Created empty cfg object
function emptyObj(obj) {

    var result = {};

    Object.keys(obj).forEach(function(key) {
        if (_.isObject(obj[key])) {
            result[key] = {};
        }
    });

    return result;
}

// Make sure they passed a number that is in range of what we want
function checkValueNumber( value, upper, lower, error ) {

    var result;

    if (_.isUndefined(value)) {
        return;
    }

    result = parseInt(value,10);

    if (_.isNaN(value)) {
        console.log('\n'+error.msg+'\n');
        error.helpFn();
    }

    if ((result >= lower || result <= upper)) {
        console.log(error.msg+value+'\n');
        error.helpFn();
    }

    return result;
}

// If the user passes something stupid then it defaults to false ( safe bet )
function getSwitch( value ) {
    if (_.isUndefined(value) || true === value) {
        value = true;
    } else {
        value = false !== value;
    }
    return value;
}



