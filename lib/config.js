/*jshint node:true, laxcomma:true */

var fs  = require('fs')
  , util = require('util');

var Configurator = function (file) {

  var self = this;
  var config = {};
  var oldConfig = {};

  this.updateConfig = function () {
    util.log('reading config file: ' + file);

    fs.readFile(file, function (err, data) {
      if (err) { throw err; }
      old_config = self.config;

      self.config = eval('config = ' + fs.readFileSync(file));
      self.emit('configChanged', self.config);
    });
  };

  this.updateConfig();

  fs.watch(file, function (event, filename) {
    if (event == 'change' && self.config.automaticConfigReload != false) {
      self.updateConfig();
    }
  });
};

util.inherits(Configurator, process.EventEmitter);

exports.Configurator = Configurator;

exports.configFile = function(file, callbackFunc) {
  if (file) { // if a file is specified create the configurator.
    
    var config = new Configurator(file);
    
    config.on('configChanged', function() {
      callbackFunc(config.config, config.oldConfig);
    });

  } else { // Or, allow configuration to be loaded from environment variables.

    callbackFunc(_configEnv(), {});

  }
};

function _configEnv() {
  var envPrefix = 'STATSD_',
    config = {};

  // Create a configuration object from  keys
  // in environment with a STATSD_ prefix. Read
  // exampleConfig.js for valid options.
  // 
  // Environment key format is as follows:
  //
  //  STATSD_graphitePort=2003
  //  STATSD_graphiteHost="carbon.hostedgraphite.com"
  //  STATSD_port=8125
  //  STATSD_graphite_legacyNamespace=false
  //  STATSD_graphite_globalPrefix="foobar"
  //  STATSD_flushInterval=1000
  //
  // This creates the configuration:
  //
  // { graphitePort: 2003,
  //   graphiteHost: 'carbon.hostedgraphite.com',
  //   port: 8125,
  //   graphite: { 
  //    legacyNamespace: false,
  //    globalPrefix: 'bananas' 
  //   },
  //   flushInterval: 1000 
  // }
  Object.keys(process.env).forEach(function(envKey) {

    if (envKey.indexOf(envPrefix) === 0) {
      
     var subKeys = envKey.replace(envPrefix, '').split('_'),
        _config = config,
        key = subKeys.pop();
      
      // walk the configuraiton sub-keys, e.g., 
      // {
      //  graphite: {
      //    legacyNamespace: false
      //  }
      // }
      subKeys.forEach(function(subKey) {
        var subConfig = _config[subKey] || {};
        _config[subKey] = subConfig;
        _config = subConfig;
      });

      try { // parse boolean and integer values.
        _config[key] = JSON.parse( process.env[envKey] );
      } catch (e) { // a parsing exception indicates a string.
        _config[key] = process.env[envKey];
      }
    }
  });

  return config;
}