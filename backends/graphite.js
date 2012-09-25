/*
 * Flush stats to graphite (http://graphite.wikidot.com/).
 *
 * To enable this backend, include 'graphite' in the backends
 * configuration array:
 *
 *   backends: ['graphite']
 *
 * This backend supports the following config options:
 *
 *   graphiteHost: Hostname of graphite server.
 *   graphitePort: Port to contact graphite server at.
 */

var net = require('net'),
   util = require('util');

var debug;
var flushInterval;
var graphiteHost;
var graphitePort;

// prefix configuration
var globalPrefix;
var prefixPersecond;
var prefixCounter;
var prefixTimer;
var prefixGauge;
var prefixSet;

// set up namespaces
var legacyNamespace = true;
var globalNamespace  = [];
var counterNamespace = [];
var timerNamespace   = [];
var gaugesNamespace  = [];
var setsNamespace     = [];

var graphiteStats = {};

var post_stats = function graphite_post_stats(statString) {
  var last_flush = graphiteStats.last_flush || 0;
  var last_exception = graphiteStats.last_exception || 0;
  if (graphiteHost) {
    try {
      var graphite = net.createConnection(graphitePort, graphiteHost);
      graphite.addListener('error', function(connectionException){
        if (debug) {
          util.log(connectionException);
        }
      });
      graphite.on('connect', function() {
        var ts = Math.round(new Date().getTime() / 1000);
        var namespace = globalNamespace.concat('statsd');
        statString += namespace.join(".") + '.graphiteStats.last_exception ' + last_exception + ' ' + ts + "\n";
        statString += namespace.join(".") + '.graphiteStats.last_flush ' + last_flush + ' ' + ts + "\n";
        this.write(statString);
        this.end();
        graphiteStats.last_flush = Math.round(new Date().getTime() / 1000);
      });
    } catch(e){
      if (debug) {
        util.log(e);
      }
      graphiteStats.last_exception = Math.round(new Date().getTime() / 1000);
    }
  }
}

var flush_stats = function graphite_flush(ts, metrics) {
  var starttime = Date.now();
  var statString = '';
  var numStats = 0;
  var key;

  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var timers = metrics.timers;
  var sets = metrics.sets;
  var pctThreshold = metrics.pctThreshold;

  for (key in counters) {
    var namespace = counterNamespace.concat(key);
    var value = counters[key];
    var valuePerSecond = value / (flushInterval / 1000); // calculate "per second" rate

    if (legacyNamespace === true) {
      statString += namespace.join(".")   + ' ' + valuePerSecond + ' ' + ts + "\n";
      statString += 'stats_counts.' + key + ' ' + value          + ' ' + ts + "\n";
    } else {
      statString += namespace.concat('rate').join(".") + ' ' + valuePerSecond + ' ' + ts + "\n";
      statString += namespace.concat('count').join(".") + ' ' + value          + ' ' + ts + "\n";
    }

    numStats += 1;
  }

  for (key in timers) {
    if (timers[key].length > 0) {
      var values = timers[key].sort(function (a,b) { return a-b; });
      var count = values.length;
      var min = values[0];
      var max = values[count - 1];

      var namespace = timerNamespace.concat(key);
      var the_key = namespace.join(".");

      var cumulativeValues = [min];
      for (var i = 1; i < count; i++) {
          cumulativeValues.push(values[i] + cumulativeValues[i-1]);
      }

      var sum = min;
      var mean = min;
      var maxAtThreshold = max;

      var message = "";

      var key2;

      for (key2 in pctThreshold) {
        var pct = pctThreshold[key2];
        if (count > 1) {
          var thresholdIndex = Math.round(((100 - pct) / 100) * count);
          var numInThreshold = count - thresholdIndex;

          maxAtThreshold = values[numInThreshold - 1];
          sum = cumulativeValues[numInThreshold - 1];
          mean = sum / numInThreshold;
        }

        var clean_pct = '' + pct;
        clean_pct.replace('.', '_');
        message += the_key + '.mean_'  + clean_pct + ' ' + mean           + ' ' + ts + "\n";
        message += the_key + '.upper_' + clean_pct + ' ' + maxAtThreshold + ' ' + ts + "\n";
        message += the_key + '.sum_'   + clean_pct + ' ' + sum            + ' ' + ts + "\n";
      }

      sum = cumulativeValues[count-1];
      mean = sum / count;

      var sumOfDiffs = 0;
      for (var i = 0; i < count; i++) {
         sumOfDiffs += (values[i] - mean) * (values[i] - mean);
      }
      var stddev = Math.sqrt(sumOfDiffs / count);

      message += the_key + '.std '   + stddev + ' ' + ts + "\n";
      message += the_key + '.upper ' + max    + ' ' + ts + "\n";
      message += the_key + '.lower ' + min    + ' ' + ts + "\n";
      message += the_key + '.count ' + count  + ' ' + ts + "\n";
      message += the_key + '.sum '   + sum    + ' ' + ts + "\n";
      message += the_key + '.mean '  + mean   + ' ' + ts + "\n";

      statString += message;

      numStats += 1;
    }
  }

  for (key in gauges) {
    var namespace = gaugesNamespace.concat(key);
    statString += namespace.join(".") + ' ' + gauges[key] + ' ' + ts + "\n";
    numStats += 1;
  }

  for (key in sets) {
    var namespace = setsNamespace.concat(key);
    statString += namespace.join(".") + '.count ' + sets[key].values().length + ' ' + ts + "\n";
    numStats += 1;
  }

  var namespace = globalNamespace.concat('statsd');
  if (legacyNamespace === true) {
    statString += 'statsd.numStats ' + numStats + ' ' + ts + "\n";
    statString += 'stats.statsd.graphiteStats.calculationtime ' + (Date.now() - starttime) + ' ' + ts + "\n";
  } else {
    statString += namespace.join(".") + '.numStats ' + numStats + ' ' + ts + "\n";
    statString += namespace.join(".") + '.graphiteStats.calculationtime ' + (Date.now() - starttime) + ' ' + ts + "\n";
  }
  post_stats(statString);
};

var backend_status = function graphite_status(writeCb) {
  for (stat in graphiteStats) {
    writeCb(null, 'graphite', stat, graphiteStats[stat]);
  }
};

exports.init = function graphite_init(startup_time, config, events) {
  debug = config.debug;
  graphiteHost = config.graphiteHost;
  graphitePort = config.graphitePort;
  config.graphite = config.graphite || {};
  globalPrefix    = config.graphite.globalPrefix;
  prefixCounter   = config.graphite.prefixCounter;
  prefixTimer     = config.graphite.prefixTimer;
  prefixGauge     = config.graphite.prefixGauge;
  prefixSet       = config.graphite.prefixSet;
  legacyNamespace = config.graphite.legacyNamespace;

  // set defaults for prefixes
  globalPrefix  = globalPrefix !== undefined ? globalPrefix : "stats";
  prefixCounter = prefixCounter !== undefined ? prefixCounter : "counters";
  prefixTimer   = prefixTimer !== undefined ? prefixTimer : "timers";
  prefixGauge   = prefixGauge !== undefined ? prefixGauge : "gauges";
  prefixSet     = prefixSet !== undefined ? prefixSet : "sets";
  legacyNamespace = legacyNamespace !== undefined ? legacyNamespace : true;


  if (legacyNamespace === false) {
    if (globalPrefix !== "") {
      globalNamespace.push(globalPrefix);
      counterNamespace.push(globalPrefix);
      timerNamespace.push(globalPrefix);
      gaugesNamespace.push(globalPrefix);
      setsNamespace.push(globalPrefix);
    }

    if (prefixCounter !== "") {
      counterNamespace.push(prefixCounter);
    }
    if (prefixTimer !== "") {
      timerNamespace.push(prefixTimer);
    }
    if (prefixGauge !== "") {
      gaugesNamespace.push(prefixGauge);
    }
    if (prefixSet !== "") {
      setsNamespace.push(prefixSet);
    }
  } else {
      globalNamespace = ['stats'];
      counterNamespace = ['stats'];
      timerNamespace = ['stats', 'timers'];
      gaugesNamespace = ['stats', 'gauges'];
      setsNamespace = ['stats', 'sets'];
  }

  graphiteStats.last_flush = startup_time;
  graphiteStats.last_exception = startup_time;

  flushInterval = config.flushInterval;

  events.on('flush', flush_stats);
  events.on('status', backend_status);

  return true;
};
