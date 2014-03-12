var Q = require ('q');
var config = require('./config');

//TODO UnitTest
function Init (){

}

Init.prototype._getConfig = function (){
  var deferred = Q.defer();
  config.configFile(process.argv[2], function (config, oldConfig) {
    deferred.resolve(config);
  });
  return deferred.promise;
};

Init.prototype._setConfigDefaut = function (promise){
  return Q.when(promise, function(config){
    config.deleteIdleStats = config.deleteIdleStats !== undefined ? config.deleteIdleStats : false;
    if (config.deleteIdleStats) {
      config.deleteCounters = config.deleteCounters !== undefined ? config.deleteCounters : true;
      config.deleteTimers = config.deleteTimers !== undefined ? config.deleteTimers : true;
      config.deleteSets = config.deleteSets !== undefined ? config.deleteSets : true;
      config.deleteGauges = config.deleteGauges !== undefined ? config.deleteGauges : true;
    }

    config.deleteCounters = config.deleteCounters || false;
    config.deleteTimers = config.deleteTimers || false;
    config.deleteSets = config.deleteSets || false;
    config.deleteGauges = config.deleteGauges || false;
    config.regex = config.regex || false;

    config.keyFlushInterval = Number((config.keyFlush && config.keyFlush.interval) || 0);
    config.udp_version = config.address_ipv6 ? 'udp6' : 'udp4';

    config.percentThreshold = config.percentThreshold || 90;
    if (!Array.isArray( config.percentThreshold)) {
      config.percentThreshold = [config.percentThreshold ]; // listify percentiles so single values work the same
    }

    return config;
  });
};
/*

Init.prototype._getConfig = function (){
  var deferred = Q.defer();
  config.configFile(process.argv[2], function (config, oldConfig) {
    conf = config;
    deferred.resolve(config);
  });
  return deferred.promise;
};

Init.prototype._setConfigStatsPrefix = function (promise){
  return Q.when(promise, function(config){
    // setup config for stats prefix
    prefixStats = config.prefixStats;
    prefixStats = prefixStats !== undefined ? prefixStats : "statsd";
    //setup the names for the stats stored in counters{}
    bad_lines_seen   = prefixStats + ".bad_lines_seen";
    packets_received = prefixStats + ".packets_received";
    timestamp_lag_namespace = prefixStats + ".timestamp_lag";

    //now set to zero so we can increment them
    counters[bad_lines_seen]   = 0;
    counters[packets_received] = 0;

    return config;
  });
};

*/
Init.prototype.run = function(){
  return  this._getConfig()
    .then(this._setConfigDefaut)
    .then(this._setConfigStatsPrefix)
}

module.exports = Init;