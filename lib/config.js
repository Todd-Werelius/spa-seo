var _    = require('underscore');
var args = require('commander');

module.exports = function( argv ) {

    // Setup our default options, these were taken from prerender sample apps and source code
    var options  = {

        // Standard options you can pass to prerender service
        workers         : process.env.PHANTOM_CLUSTER_NUM_WORKERS || 1,     // Max number of workers ( clusters )
        phantomBasePort : process.env.PHANTOM_CLUSTER_BASE_PORT   || 12300, // PhantomJS Server Cluster Starting Port

        iterations      : process.env.PHANTOM_WORKER_ITERATIONS   || 200,   // Calls before phantomJS

        port            : process.env.PORT                        || 3030,  // Port you will send seo

        plugins         : [
            "removeScriptTags",
            "httpHeaders"
        ],

        // prerenderio environment variable overrides to fine tune the server dependent on your
        // SPA's performance
        env             : {

        },

        // Passed directly to phantomjs
        phantomArguments : [

            '--load-images=false',
            '--ignore-ssl-errors=true',
            '--ssl-protocol=tlsv1'
        ]
    };

    function checkValueNumber(value, upper, lower, notZero, flag, value, args, onErrorMsg) {

        var result;

        if (_.isUndefined(value)) {
            return;
        }

        if (NaN === (result = parseInt(value))) {
            console.log(onErrorMsg+value+'\n');
            args.help();
        }

        if ((result < lower || result > upper) || (notZero && 0 === value)) {
            console.log(onErrorMsg+value+'\n');
            args.help();
        }

        return result;
    }

    // Get any command line options, these will override all other options if present
    args
        .version('0.0.1')
        .usage(' [options]')
        .description('This is a description')

        .option('-C, --config         [filename]',"a json configuration file (see config.json)",function(value) {

            // If the user did not provide a value
            try {
                var config   = require('../' + value);
                    value    = _.extend(options,config);

            } catch(error) {
                console.log("the config file " + value + 'does not exist or is corrupt\n');
                args.help();
           }

           return value;
        })

        .option('-W, --workers         [number]',"Maximum number of CPU's : -1 to use all, default 1",function(value){
            return checkValueNumber(value,-1,64,true,args,"workers must be -1 or a number between 1 and maxCPU's but was : "+value);
        })
        .option('-I, --iterations      [number]','Number of requests for restarting phantomJS service, default 200',function(value){
            return checkValueNumber(value,1,500,true,args,"iterations must be a number between 1 and 500 but was : "+value);
        })
        .option('-P, --port            [number]','Port this server will listen on, default 3030',function(value){
            return checkValueNumber(value,3001,64000,true,args,"port must be a number between 1000 and 6400 but was : "+value);
        })
        .option('-B, --phantomBasePort [number]','Starting port for phantomjs cluster, default 12300',function(){
            return checkValueNumber(value,3001,64000,true,args,"phantomBasePort must be a number between 1000 and 6400 but was : "+value);
        })
    .parse(argv);

    return options;
}

/**
 These are just here for reference, they can only be set using the env : object in config.json or in the
 command line

 var PAGE_DONE_CHECK_TIMEOUT             = process.env.PAGE_DONE_CHECK_TIMEOUT           || 50;
 var RESOURCE_DOWNLOAD_TIMEOUT           = process.env.RESOURCE_DOWNLOAD_TIMEOUT         || 10 * 1000;
 var WAIT_AFTER_LAST_REQUEST             = process.env.WAIT_AFTER_LAST_REQUEST           || 500;
 var JS_CHECK_TIMEOUT                    = process.env.JS_CHECK_TIMEOUT                  || 50;
 var JS_TIMEOUT                          = process.env.JS_TIMEOUT                        || 10 * 1000;
 var EVALUATE_JAVASCRIPT_CHECK_TIMEOUT   = process.env.EVALUATE_JAVASCRIPT_CHECK_TIMEOUT || 50;
 */



