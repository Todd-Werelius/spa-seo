var _       = require('underscore');
var args    = require('commander');

/**
 * Configures and object used to control the prerender server
 *
 * The function first constructs a default cfg object containing 3 child objects
 *  options an object that contains prerender properties with default settings used to configure the service
 *
 *  env     an object that contains prerender process.env properties, typically you leave these alone but they
 *          can be used to override prerender defaults (use with caution)
 *
 *  plugins an object that contains key's that map to prerender middleware, if set to true they will be loaded
 *
 * The function then looks at command line arguments, one of which allows a cfg file to be specified, this
 * cfg file is a json object and if present will be used to add or overwrite objects and properties in the cfg
 * default object
 *
 * Finally the function uses any command line arguments to set final values of the cfg object ( or it's associated
 * child object )
 *
 * The order of precedence is command line arguments override any cfg file or default properties, and the cfg file ( if
 * used ) overrides any default properties
 *
 * @param argv process command line arguments
 * @returns {{options: {workers: (*|number), phantomBasePort: (*|number), iterations: (*|number), port: (*|number), phantomArguments: string[]}, env: {PAGE_DONE_CHECK_TIMEOUT: number, RESOURCE_DOWNLOAD_TIMEOUT: number, WAIT_AFTER_LAST_REQUEST: number, JS_CHECK_TIMEOUT: number, JS_TIMEOUT: number, EVALUATE_JAVASCRIPT_CHECK_TIMEOUT: number}, plugins: {removeScriptTags: boolean, httpHeaders: boolean, basicAuth: boolean, whitelist: boolean, blacklist: boolean, logger: boolean, inMemoryHtmlCache: boolean, s3HtmlCache: boolean}}}
 */

module.exports = function( argv ) {

    // Setup our default cfg, these were taken from prerender sample apps and source code
    var cfg  = {

        // Standard options you can pass to prerender service

        options : {
            workers         : process.env.PHANTOM_CLUSTER_NUM_WORKERS || 1,   // Max number of workers ( clusters )
            phantomBasePort : process.env.PHANTOM_CLUSTER_BASE_PORT || 12300, // PhantomJS Server Cluster Starting Port
            iterations      : process.env.PHANTOM_WORKER_ITERATIONS || 200,   // Calls before phantomJS restarts
            port            : process.env.PORT || 3030,                       // Port you will send bot requests to

            // Passed directly to phantomjs
            phantomArguments : [

                '--load-images=false',
                '--ignore-ssl-errors=true',
                '--ssl-protocol=tlsv1'
            ]
        },

        // prerender environment variable overrides
        env  : [
            { PAGE_DONE_CHECK_TIMEOUT           : { set: false, value : process.env.PAGE_DONE_CHECK_TIMEOUT || 50 }},
            { RESOURCE_DOWNLOAD_TIMEOUT         : { set: false, value : process.env.RESOURCE_DOWNLOAD_TIMEOUT || 10000}},
            { WAIT_AFTER_LAST_REQUEST           : { set: false, value : process.env.WAIT_AFTER_LAST_REQUEST || 500}},
            { JS_CHECK_TIMEOUT                  : { set: false, value : process.env.JS_CHECK_TIMEOUT || 50}},
            { JS_TIMEOUT                        : { set: false, value : process.env.JS_TIMEOUT || 10000}},
            { EVALUATE_JAVASCRIPT_CHECK_TIMEOUT : { set: false, value : process.env.EVALUATE_JAVASCRIPT_CHECK_TIMEOUT || 50}}
        ],

        plugins: {
            "removeScriptTags" : true,
            "httpHeaders"      : true,
            "basicAuth"        : false,
            "whitelist"        : false,
            "blacklist"        : false,
            "logger"           : false,
            "inMemoryHtmlCache": false,
            "s3HtmlCache"      : false
        }
    };

    function checkValueNumber(value, upper, lower, notZero, args, onErrorMsg) {

        var result;

        if (_.isUndefined(value)) {
            return;
        }

        result = parseInt(value);

        if (_.isNaN(value)) {
            console.log(onErrorMsg+value+'\n');
            args.help();
        }

        if ((result < lower || result > upper) || (notZero && 0 === value)) {
            console.log(onErrorMsg+value+'\n');
            args.help();
        }

        return result;
    }

    // Get any command line options, these will override any cfg.options and cfg.env options if present
    args
        .version('0.0.1')
        .usage(' [options]')
        .description('This is a description')

        .option('-C , --config [filename]',"a json configuration file located in the root (see config.json)",function(value) {

            // If the user did not provide a value
            try {
                var config   = require('../' + value);
                    value    = _.extend(cfg,config);

            } catch(error) {
                console.log("the config file " + value + 'does not exist or is corrupt\n');
                //noinspection JSUnresolvedFunction
                args.help();
           }
           return value;
        })

        .option('-W , --workers [number]',"Number of CPU's to use : -1 to use all, default 1",function(value){
            return checkValueNumber(value,-1,64,true,args,"workers must be -1 or a number between 1 and maxCPU's but was : "+value);
        })
        .option('-I , --iterations [number]','Number of requests for restarting phantomJS service, default 200',function(value){
            return checkValueNumber(value,1,500,true,args,"iterations must be a number between 1 and 500 but was : "+value);
        })
        .option('-P , --port [number]','Port this server will listen on, default 3030',function(value){
            return checkValueNumber(value,3001,64000,true,args,"port must be a number between 1000 and 6400 but was : "+value);
        })
        .option('-B , --phantomBasePort [number]','Starting port for phantomjs cluster, default 12300',function(){
            return checkValueNumber(value,3001,64000,true,args,"phantomBasePort must be a number between 1000 and 6400 but was : "+value);
        })
        .option('-NS, --removeScriptTags [boolean]' ,'Load prerender removeScriptTags middleware, default true')
        .option('-HH, --httpHeaders [boolean]'      ,'Load prerender httpHeaders middleware, default true')
        .option('-BA, --basicAuth [boolean]'        ,'Load prerender basicAuth middleware, default false')
        .option('-WL, --whitelist [boolean]'        ,'Load prerender whitelist middleware, default false')
        .option('-BL, --blacklist [boolean]'        ,'Load prerender blacklist middleware, default false')
        .option('-LG, --logger [boolean]'           ,'Load prerender logger middleware, default false')
        .option('-MC, --inMemoryHtmlCache [boolean]','Load prerender inMemoryHtmlCache middleware, default false')
        .option('-S3, --s3HtmlCache [boolean]'      ,'Load prerender s3HtmlCache middleware, default false')
    .parse(argv);

    // Merge the command line args ( if any ) into the cfg object

    return cfg;
};



