/*jshint node:true, laxcomma:true */

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
 *   graphitePort: Port for the graphite text collector. Defaults to 2003.
 *   graphitePicklePort: Port for the graphite pickle collector. Defaults to 2004.
 *   graphiteProtocol: Either 'text' or 'pickle'. Defaults to 'text'.
 * 
 * If graphiteHost is not specified, metrics are processed but discarded.
 */

var net = require('net'),
    logger = require('../lib/logger');

// this will be instantiated to the logger
var l;

var debug;
var flushInterval;
var graphiteHost;
var graphitePort;
var graphitePicklePort;
var graphiteProtocol;

// prefix configuration
var globalPrefix;
var prefixPersecond;
var prefixCounter;
var prefixTimer;
var prefixGauge;
var prefixSet;

// set up namespaces
var legacyNamespace  = true;
var globalNamespace  = [];
var counterNamespace = [];
var timerNamespace   = [];
var gaugesNamespace  = [];
var setsNamespace    = [];

var graphiteStats = {};

var post_stats = function graphite_post_stats(stats) {
  var last_flush = graphiteStats.last_flush || 0;
  var last_exception = graphiteStats.last_exception || 0;
  var flush_time = graphiteStats.flush_time || 0;
  var flush_length = graphiteStats.flush_length || 0;

  if (graphiteHost) {
    try {
      var port = graphiteProtocol == 'pickle' ? graphitePicklePort : graphitePort;
      var graphite = net.createConnection(port, graphiteHost);
      graphite.addListener('error', function(connectionException){
        if (debug) {
          l.log(connectionException);
        }
      });
      graphite.on('connect', function() {
        var ts = Math.round(Date.now() / 1000);
        var namespace = globalNamespace.concat(prefixStats).join(".");
        stats.add(namespace + '.graphiteStats.last_exception', last_exception, ts);
        stats.add(namespace + '.graphiteStats.last_flush', last_flush, ts);
        stats.add(namespace + '.graphiteStats.flush_time', flush_time, ts);
        stats.add(namespace + '.graphiteStats.flush_length', flush_length, ts);

        var stats_payload = graphiteProtocol == 'pickle' ? stats.toPickle() : stats.toText();

        var starttime = Date.now();
        this.write(stats_payload);
        this.end();

        graphiteStats.flush_time = (Date.now() - starttime);
        graphiteStats.flush_length = stats_payload.length;
        graphiteStats.last_flush = Math.round(Date.now() / 1000);
      });
    } catch(e){
      if (debug) {
        l.log(e);
      }
      graphiteStats.last_exception = Math.round(Date.now() / 1000);
    }
  }
};

// A single measurement for sending to graphite.
function Metric(key, value, ts) {
  var m = this;
  this.key = key;
  this.value = value;
  this.ts = ts;

  // return a string representation of this metric appropriate 
  // for sending to the graphite collector. does not include
  // a trailing newline.
  this.toText = function() {
    return m.key + " " + m.value + " " + m.ts;
  };
}

// A collection of measurements for sending to graphite.
function Stats() {
  var s = this;
  this.metrics = [];
  this.add = function(key, value, ts) {
    s.metrics.push(new Metric(key, value, ts));
  };

  this.toText = function() {
    return s.metrics.map(function(m) { return m.toText(); }).join('\n') + '\n';
  };

  this.toPickle = function() {
    return '\n';
  };
}

var flush_stats = function graphite_flush(ts, metrics) {
  var starttime = Date.now();
  var numStats = 0;
  var key;
  var timer_data_key;
  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var timers = metrics.timers;
  var sets = metrics.sets;
  var counter_rates = metrics.counter_rates;
  var timer_data = metrics.timer_data;
  var statsd_metrics = metrics.statsd_metrics;

  // Flatten all the different types of metrics into a single
  // collection so we can allow serialization to either the graphite
  // text and pickle formats.
  var stats = new Stats();

  for (key in counters) {
    var namespace = counterNamespace.concat(key);
    var value = counters[key];
    var valuePerSecond = counter_rates[key]; // pre-calculated "per second" rate

    if (legacyNamespace === true) {
      stats.add(namespace.join("."), valuePerSecond, ts);
      stats.add('stats_counts.' + key, value, ts);
    } else {
      stats.add(namespace.concat('rate').join("."), valuePerSecond, ts);
      stats.add(namespace.concat('count').join("."), value, ts);
    }

    numStats += 1;
  }

  for (key in timer_data) {
    var namespace = timerNamespace.concat(key);
    var the_key = namespace.join(".");
    for (timer_data_key in timer_data[key]) {
      if (typeof(timer_data[key][timer_data_key]) === 'number') {
        stats.add(the_key + '.' + timer_data_key, timer_data[key][timer_data_key], ts);
      } else {
        for (var timer_data_sub_key in timer_data[key][timer_data_key]) {
          if (debug) {
            l.log(timer_data[key][timer_data_key][timer_data_sub_key].toString());
          }
          stats.add(the_key + '.' + timer_data_key + '.' + timer_data_sub_key,
                    timer_data[key][timer_data_key][timer_data_sub_key], ts);
        }
      }
    }
    numStats += 1;
  }

  for (key in gauges) {
    stats.add(gaugesNamespace.concat(key).join("."), gauges[key], ts);
    numStats += 1;
  }

  for (key in sets) {
    stats.add(setsNamespace.concat([key, 'count']).join("."), 
              sets[key].values().length, ts);
    numStats += 1;
  }

  if (legacyNamespace === true) {
    stats.add(prefixStats + '.numStats', numStats, ts);
    stats.add('stats.' + prefixStats + '.graphiteStats.calculationtime', 
              (Date.now() - starttime), ts);
    for (key in statsd_metrics) {
      stats.add('stats.' + prefixStats + '.' + key, statsd_metrics[key], ts);
    }
  } else {
    var namespace = globalNamespace.concat(prefixStats);
    stats.add(namespace.concat('numStats').join("."), numStats, ts);
    stats.add(namespace.concat('graphiteStats.calculationtime').join("."),
              (Date.now() - starttime), ts);
    for (key in statsd_metrics) {
      stats.add(namespace.concat(key).join("."), statsd_metrics[key], ts);
    }
  }
  post_stats(stats);
  if (debug) {
   l.log("numStats: " + numStats);
  }
};

var backend_status = function graphite_status(writeCb) {
  for (var stat in graphiteStats) {
    writeCb(null, 'graphite', stat, graphiteStats[stat]);
  }
};

exports.init = function graphite_init(startup_time, config, events) {
  l = new logger.Logger(config.log || {});
  debug = config.debug;
  graphiteHost = config.graphiteHost;
  graphitePort = config.graphitePort || 2003;
  graphitePicklePort = config.graphitePicklePort || 2004;
  graphiteProtocol = config.graphiteProtocol || 'text';
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
  graphiteStats.flush_time = 0;
  graphiteStats.flush_length = 0;

  flushInterval = config.flushInterval;

  events.on('flush', flush_stats);
  events.on('status', backend_status);

  return true;
};
