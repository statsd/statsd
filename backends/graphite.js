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
var postInterval;
var graphiteHost;
var graphitePort;
var statString;

var graphiteStats = {};

var post_stats = function graphite_post_stats() {
  if (graphiteHost) {
    try {
      var graphite = net.createConnection(graphitePort, graphiteHost);
      graphite.addListener('error', function(connectionException){
        if (debug) {
          util.log(connectionException);
        }
      });
      graphite.on('connect', function() {
        this.write(statString);
        statString = '';
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
  var numStats = 0;
  var key;

  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var timers = metrics.timers;
  var pctThreshold = metrics.pctThreshold;

  for (key in counters) {
    var value = counters[key];
    var valuePerSecond = value / (flushInterval / 1000); // calculate "per second" rate

    // Split key into standard prefix and metric details
    var preKey = key.match(/(^(?:production|staging)\.applications\.\w+)(.+)/)[1];
    var endKey = key.match(/(^(?:production|staging)\.applications\.\w+)(.+)/)[2];

    // Vitrue stats
    statString += preKey + '.counters' + endKey + '.count_per_sec ' + valuePerSecond + ' ' + ts + "\n";
    statString += preKey + '.counters' + endKey + '.count '         + value          + ' ' + ts + "\n";

    numStats += 1;
  }

  for (key in timers) {

    // Split key into standard prefix and metric details
    var preKey = key.match(/(^(?:production|staging)\.applications\.\w+)(.+)/)[1];
    var endKey = key.match(/(^(?:production|staging)\.applications\.\w+)(.+)/)[2];
    var customKey = preKey + '.timers' + endKey;

    if (timers[key].length > 0) {
      var values = timers[key].sort(function (a,b) { return a-b; });
      var count = values.length;
      var min = values[0];
      var max = values[count - 1];

      var mean = min;
      var maxAtThreshold = max;

      var message = "";

      var key2;

      for (key2 in pctThreshold) {
        var pct = pctThreshold[key2];
        if (count > 1) {
          var thresholdIndex = Math.round(((100 - pct) / 100) * count);
          var numInThreshold = count - thresholdIndex;
          var pctValues = values.slice(0, numInThreshold);
          maxAtThreshold = pctValues[numInThreshold - 1];

          // average the remaining timings
          var sum = 0;
          for (var i = 0; i < numInThreshold; i++) {
            sum += pctValues[i];
          }

          mean = sum / numInThreshold;
        }

        var clean_pct = '' + pct;
        clean_pct.replace('.', '_');

        // Vitrue Stats
        message += customKey + '.mean_'  + clean_pct + ' ' + mean           + ' ' + ts + "\n";
        message += customKey + '.upper_' + clean_pct + ' ' + maxAtThreshold + ' ' + ts + "\n";
      }

      // Vitrue Stats
      message += customKey + '.upper ' + max   + ' ' + ts + "\n";
      message += customKey + '.lower ' + min   + ' ' + ts + "\n";
      message += customKey + '.count ' + count + ' ' + ts + "\n";

      statString += message;

      numStats += 1;
    }
  }

  for (key in gauges) {

    // Split key into standard prefix and metric details
    var preKey = key.match(/(^(?:production|staging)\.applications\.\w+)(.+)/)[1];
    var endKey = key.match(/(^(?:production|staging)\.applications\.\w+)(.+)/)[2];

    // Vitrue Stats
    statString += preKey + '.gauges' + endKey + ' ' + gauges[key] + ' ' + ts + "\n";

    numStats += 1;
  }

  // Vitrue stats
  statString += 'statsd.awsproxy.numStats ' + numStats + ' ' + ts + "\n";

  if (!postInterval || ((ts - graphiteStats.last_flush) >= (postInterval))) {
    post_stats();
  }
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

  graphiteStats.last_flush = startup_time;
  graphiteStats.last_exception = startup_time;

  flushInterval = config.flushInterval;
  postInterval = config.postInterval;

  statString = '';

  events.on('flush', flush_stats);
  events.on('status', backend_status);

  return true;
};
