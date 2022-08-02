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
 *   graphitePort: Port to contact graphite server at.
 */

var net = require('net');

// this will be instantiated to the logger
var l;

var debug;
var flushInterval;
var graphiteHost;
var graphitePort;
var flush_counts;

// prefix configuration
var globalPrefix;
var prefixPersecond;
var prefixCounter;
var prefixTimer;
var prefixGauge;
var prefixSet;
var globalSuffix;

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
      var graphite = net.createConnection(graphitePort, graphiteHost);
      graphite.addListener('error', function(connectionException){
        if (debug) {
          l.log(connectionException);
        }
      });
      graphite.on('connect', function() {
        var ts = Math.round(new Date().getTime() / 1000);
        var namespace = globalNamespace.concat(prefixStats).join(".");
        stats.add(namespace + '.graphiteStats.last_exception' + globalSuffix, last_exception, ts);
        stats.add(namespace + '.graphiteStats.last_flush'     + globalSuffix, last_flush    , ts);
        stats.add(namespace + '.graphiteStats.flush_time'     + globalSuffix, flush_time    , ts);
        stats.add(namespace + '.graphiteStats.flush_length'   + globalSuffix, flush_length  , ts);

        payload = stats.toText();

        var starttime = Date.now();
        this.write(payload);
        this.end();

        graphiteStats.flush_time = (Date.now() - starttime);
        graphiteStats.flush_length = payload.length;
        graphiteStats.last_flush = Math.round(new Date().getTime() / 1000);
      });
    } catch(e){
      if (debug) {
        l.log(e);
      }
      graphiteStats.last_exception = Math.round(new Date().getTime() / 1000);
    }
  }
};

function Metric(key, value, ts) {
  var m = this;
  this.key = key;
  this.value = value;
  this.ts = ts;

  this.toText = function () {
    return m.key + " " + m.value + " " + m.ts;
  }
}

function Stats() {
  var s = this;
  this.metrics = [];
  
  this.add = function (key, value, ts) {
    s.metrics.push(new Metric(key, value, ts));
  }

  this.toText = function () {
    return s.metrics.map(function(m) { return m.toText(); }).join('\n') + '\n';
  }
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

  function format(namespace, key) {
    var splitName = key.split(';');
    var keyName = splitName[0];
    var tags = splitName.length > 1 ? (';' + splitName.slice(1).join(';')) : '';

    return namespace.concat(keyName, [].slice.call(arguments, 2)).join('.') + globalSuffix + tags;
  }

  var stats = new Stats();

  for (key in counters) {

    var value = counters[key];
    var valuePerSecond = counter_rates[key];

    if (legacyNamespace === true) {
      stats.add(format(counterNamespace, key), valuePerSecond, ts);
      if (flush_counts) {
        stats.add(format(['stats_counts'], key), value, ts);
      }
    } else {
      stats.add(format(counterNamespace, key, 'rate'), valuePerSecond, ts);
      if (flush_counts) {
        stats.add(format(counterNamespace, key, 'count'), value, ts);
      }
    }

    numStats += 1;
  }

  for (key in timer_data) {
    for (timer_data_key in timer_data[key]) {
      if (typeof(timer_data[key][timer_data_key]) === 'number') {
        stats.add(format(timerNamespace, key, timer_data_key), timer_data[key][timer_data_key], ts);
      } else {
        for (var timer_data_sub_key in timer_data[key][timer_data_key]) {
          if (debug) {
            l.log(timer_data[key][timer_data_key][timer_data_sub_key].toString());
          }
          stats.add(format(timerNamespace, key, timer_data_key, timer_data_sub_key),
                    timer_data[key][timer_data_key][timer_data_sub_key], ts);
        }
      }
    }
    numStats += 1;
  }

  for (key in gauges) {
    stats.add(format(gaugesNamespace, key), gauges[key], ts);
    numStats += 1;
  }

  for (key in sets) {
    stats.add(format(setsNamespace, key, 'count'), sets[key].size(), ts);
    numStats += 1;
  }

  if (legacyNamespace === true) {
    stats.add(prefixStats + '.numStats' + globalSuffix, numStats, ts);
    stats.add('stats.' + prefixStats + '.graphiteStats.calculationtime' + globalSuffix, (Date.now() - starttime), ts);
    for (key in statsd_metrics) {
      stats.add('stats.' + prefixStats + '.' + key + globalSuffix, statsd_metrics[key], ts);
    }
  } else {
    stats.add(format(globalNamespace, prefixStats, 'numStats'), numStats, ts);
    stats.add(format(globalNamespace, prefixStats, 'graphiteStats', 'calculationtime'), (Date.now() - starttime) , ts);
    for (key in statsd_metrics) {
      stats.add(format(globalNamespace, prefixStats, key), statsd_metrics[key], ts);
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

exports.init = function graphite_init(startup_time, config, events, logger) {
  debug = config.debug;
  l = logger;
  graphiteHost = config.graphiteHost;
  graphitePort = config.graphitePort;
  config.graphite = config.graphite || {};
  globalPrefix    = config.graphite.globalPrefix;
  prefixCounter   = config.graphite.prefixCounter;
  prefixTimer     = config.graphite.prefixTimer;
  prefixGauge     = config.graphite.prefixGauge;
  prefixSet       = config.graphite.prefixSet;
  globalSuffix    = config.graphite.globalSuffix;
  legacyNamespace = config.graphite.legacyNamespace;
  prefixStats     = config.prefixStats;


  // set defaults for prefixes & suffix
  globalPrefix  = globalPrefix !== undefined ? globalPrefix : "stats";
  prefixCounter = prefixCounter !== undefined ? prefixCounter : "counters";
  prefixTimer   = prefixTimer !== undefined ? prefixTimer : "timers";
  prefixGauge   = prefixGauge !== undefined ? prefixGauge : "gauges";
  prefixSet     = prefixSet !== undefined ? prefixSet : "sets";
  prefixStats   = prefixStats !== undefined ? prefixStats : "statsd";
  legacyNamespace = legacyNamespace !== undefined ? legacyNamespace : true;

  // In order to unconditionally add this string, it either needs to be
  // a single space if it was unset, OR surrounded by a . and a space if
  // it was set.
  globalSuffix  = globalSuffix !== undefined ? '.' + globalSuffix : '';

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

  flush_counts = typeof(config.flush_counts) === "undefined" ? true : config.flush_counts;

  events.on('flush', flush_stats);
  events.on('status', backend_status);

  return true;
};
