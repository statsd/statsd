/*
 * Flush stats to graphite (http://graphite.wikidot.com/).
 *
 * To enable this backend, include 'graphite-http' in the backends
 * configuration array:
 *
 *   backends: ['graphite-http']
 *
 * This backend supports the following config options:
 *
 *   bridgeURL: URL of the HTTP bridge, with trailing slash.
 *   api_key: API key, appended to URL.
 */

var net = require('net'),
    logger = require('../lib/logger'),
    http = require('http'),
    url = require('url');

// this will be instantiated to the logger
var l;

var debug;
var flushInterval;
var bridgeURL;
var api_key;

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

function metric(path, val, timestamp){
    this.metric = path;
    this.value = val;
    this.timestamp = timestamp;
}

var post_stats = function graphite_post_stats(metricsArray) {
  var last_flush = graphiteStats.last_flush || 0;
  var last_exception = graphiteStats.last_exception || 0;
  var flush_time = graphiteStats.flush_time || 0;
  var flush_length = graphiteStats.flush_length || 0;

  if (bridgeURL) {
    try {
      var starttime = Date.now();
      var ts = Math.round(new Date().getTime() / 1000);
      var namespace = globalNamespace.concat(prefixStats).join(".");

      metricsArray.push(new metric(namespace + '.graphiteStats.last_exception', last_exception, ts));
      metricsArray.push(new metric(namespace + '.graphiteStats.last_flush', last_flush, ts));
      metricsArray.push(new metric(namespace + '.graphiteStats.flush_time', flush_time, ts));
      metricsArray.push(new metric(namespace + '.graphiteStats.flush_length', flush_length, ts));

      var data = JSON.stringify(metricsArray);

      var options = url.parse(bridgeURL + api_key);
      options.method = 'POST';
      options.headers = {'Content-Length': data.length};

      var req = http.request(options, function(res) {
        res.setEncoding('utf8');
      });

      req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        graphiteStats.last_exception = Math.round(new Date().getTime() / 1000);
      });

      req.on('close', function(e){
        graphiteStats.flush_time = (Date.now() - starttime);
        graphiteStats.flush_length = data.length;
        graphiteStats.last_flush = Math.round(new Date().getTime() / 1000);
      });

      req.write(data);
      req.end();
    } catch(e){
      if (debug) {
        l.log(e);
      }
      graphiteStats.last_exception = Math.round(new Date().getTime() / 1000);
    }
  }
};

var flush_stats = function graphite_flush(ts, metrics) {
  var starttime = Date.now();
  var metricsArray = [];
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

  for (key in counters) {
    var namespace = counterNamespace.concat(key);
    var value = counters[key];
    var valuePerSecond = counter_rates[key]; // pre-calculated "per second" rate

    if (legacyNamespace === true) {
      metricsArray.push(new metric(namespace.join("."), valuePerSecond, ts));
      metricsArray.push(new metric('stats_counts.' + key, value, ts));
    } else {
      metricsArray.push(new metric(namespace.concat('rate').join("."), valuePerSecond, ts));
      metricsArray.push(new metric(namespace.concat('count').join("."), value, ts));
    }
  }

  for (key in timer_data) {
    var namespace = timerNamespace.concat(key);
    var the_key = namespace.join(".");
    for (timer_data_key in timer_data[key]) {
      if (typeof(timer_data[key][timer_data_key]) === 'number') {
        metricsArray.push(new metric(the_key + '.' + timer_data_key, timer_data[key][timer_data_key], ts));
      } else {
        for (var timer_data_sub_key in timer_data[key][timer_data_key]) {
          var mpath = the_key + '.' + timer_data_key + '.' + timer_data_sub_key;
          var mval = timer_data[key][timer_data_key][timer_data_sub_key]
          if (debug) {
            l.log(mval.toString());
          }
          metricsArray.push(new metric(mpath, mval, ts));
        }
      }
    }
  }

  for (key in gauges) {
    var namespace = gaugesNamespace.concat(key);
    metricsArray.push(new metric(namespace.join("."), gauges[key], ts));
  }

  for (key in sets) {
    var namespace = setsNamespace.concat(key);
    metricsArray.push(new metric(namespace.join(".") + '.count', sets[key].values().length, ts));
  }

  var namespace = globalNamespace.concat(prefixStats);
  if (legacyNamespace === true) {
    metricsArray.push(new metric(prefixStats + '.numStats', numStats, ts));
    metricsArray.push(new metric('stats.' + prefixStats + '.graphiteStats.calculationtime', (Date.now() - starttime), ts));
    for (key in statsd_metrics) {
      metricsArray.push(new metric('stats.' + prefixStats + '.' + key, statsd_metrics[key], ts));
    }
  } else {
    metricsArray.push(new metric(namespace.join(".") + '.numStats', numStats, ts));
    metricsArray.push(new metric(namespace.join(".") + '.graphiteStats.calculationtime', (Date.now() - starttime), ts));
    for (key in statsd_metrics) {
      var the_key = namespace.concat(key);
      metricsArray.push(new metric(the_key.join("."), statsd_metrics[key], ts));
    }
  }

  post_stats(metricsArray);
};

var backend_status = function graphite_status(writeCb) {
  for (var stat in graphiteStats) {
    writeCb(null, 'graphite', stat, graphiteStats[stat]);
  }
};

exports.init = function graphite_init(startup_time, config, events) {
  l = new logger.Logger(config.log || {});
  debug = config.debug;
  bridgeURL = config.bridgeURL;
  api_key = config.api_key;
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