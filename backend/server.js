
/*
 *      Config
 */
let _localhost = "http://0.0.0.0";
let _port=8101;

// global config params of backend server app
global.gConfig={

    // web domain
    port: _port,                                // port on which backend will run (when in debug mode)
    origin: "http://localhost:"+_port+"/",      // 
    localhost: _localhost,

    // cookie / auth
    appName: "identity",                    // app Name used for naming the cookie
    jwtKey: "mysecretforIdentityJWT",       // some basic key for encoding cookies 
    authentication_expire: "72h",           // 72 hours expiration of our cookie

    // sender email
    email: "info@opensourceais.com",
  
    prod:"https://identity.opensourceais.com/",
    debug: "http://localhost:"+_port+"/", 
    tunnel: null,                           // the tunnel (use only for debug)

    // identus
    identus: {
        adminKey: null,
        host: "http://localhost:8100/"
    },

    // misc
    isDocker: false,
    isDebug: true,                      // change to false to test PROD version
    version: "1.0.0"
};

// we process all params given at start
_setParams = function(_config) {
    if(_config.VERSION) {gConfig.version=_config.VERSION;}
    console.log("VERSION="+gConfig.version);
    if(_config.CACHE_SECRET) {gConfig.cacheKey=_config.CACHE_SECRET; }
    console.log("CACHE_SECRET was set");
    if(_config.JWT_SECRET) {gConfig.jwtKey=_config.JWT_SECRET; }
    console.log("JWT_SECRET was set");
    if(_config.IDENTUS_ADMIN) {gConfig.identus.adminKey=_config.IDENTUS_ADMIN;}
    console.log("IDENTUS ADMIN KEY WAS SET");
    if(_config.IDENTUS_HOST) {gConfig.identus.host=_config.IDENTUS_HOST;}
    console.log("IDENTUS HOST WAS SET TO "+_config.IDENTUS_HOST);
    if(_config.TUNNEL) {gConfig.tunnel=_config.TUNNEL;}
    console.log("TUNNEL WAS SET TO "+_config.TUNNEL);

    if(_config.EXTRA) {
        return _config.EXTRA;
    }
    return null;
}

// Running on Prod ??
if(gConfig.isDocker || process.env.DOCKER===true || process.env.DOCKER==="true") {
    gConfig.isDocker=true; 
    gConfig.isDebug=false;
    gConfig.origin="https://identity.opensourceais.com/",
    console.log("DOCKER=TRUE");

    // process config from params passed to docker
    _setParams(process.env);
}
else {
    console.log("DOCKER=FALSE");

    // case of localhost processing
    _processEnvConfig = function(val) {
        if(val.substr(0,4)=="ENV=") {
            var _config = require('./'+val.substr(4, val.length));
            
            while (_config) {               
                let _extra=_setParams(_config);
                if(_extra) {
                    _config = require('./'+_extra);
                }
                else {
                    _config=null;
                }
            }
        }
    }
}


// just to check all arguments passed by node
process.argv.forEach(function (val, index, array) {
    console.log(index + ': ' + val);
    if(index==2) {
        if(val.substr(0,4)=="env=" || val.substr(0,4)=="ENV=") {
            process.env.NODE_ENV=val.substr(4, val.length);           // set the config if passed in param
        }
        _processEnvConfig(val);
    }
});

/*
 *      App
 */

const http = require('http');
const module_app = require('./node/app');       // to start the app in debug or prod...

let app = module_app.createApp();
app.set('port', gConfig.port);
app.enable('trust proxy');

let server = http.createServer(app);
if(gConfig.isDocker) {
    server.listen(8080, "0.0.0.0");          // DOCKER
}
else{
    /* localhost config... */
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();

    // Find the IPv4 address of the first network interface that is not a loopback interface
    console.log(networkInterfaces);
    let _interface=networkInterfaces.Ethernet;
    if(!_interface) {_interface=networkInterfaces}
    
    const networkInterface = Object.values(_interface)
    .flat()
    .find(interface => !interface.internal && interface.family === 'IPv4');

    gConfig.localhost="http://"+networkInterface.address;         // Get the formatted IP address  ; somehow calling localhost does not work well sometimes... this IP is for localhost, change it where necessary   

    server.listen(gConfig.port);                      // NORMAL USAGE
}
console.log("Running on "+gConfig.localhost + ":"+gConfig.port);

console.log("IDENTITY node running here:  "+global.gConfig.origin);


gConfig.server= server;
gConfig.app= app;

module_app.async_initializeApp({
    app: app,
    env: process.env.NODE_ENV,
    config: gConfig,
    })
    .then(bOK => {
        if(!bOK) {
            process.exit(1);  
        }
    })

process.on('uncaughtException', function (err) {
    console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
    if(err.stack) {console.error(err.stack);}
//    process.exit(1);
});
