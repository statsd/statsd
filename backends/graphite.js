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

// set up namespaces
var graphiteStats = {};

var post_stats = function graphite_post_stats(statString) {
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
  var get_metric_line = function(type, key, value) {
    namespace = [key, type]
    return namespace.join('.') + ' ' + value + ' ' + ts + "\n";
  };
  var ts_suffix = ' ' + ts + "\n";
  var starttime = Date.now();
  var statString = '';
  var numStats = 0;
  var key;
  var timer_data_key;
  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var timers = metrics.timers;
  var timers_lf = metrics.timers_lf;
  var sets = metrics.sets;
  var timer_data = metrics.timer_data;


  for (key in counters) {
    statString += get_metric_line('counter', key, counters[key])
    numStats += 1;
  }

  for (key in timer_data) {
    if (Object.keys(timer_data).length > 0) {
      for (timer_data_key in timer_data[key]) {
        statString += get_metric_line('timer.' + timer_data_key, key, timer_data[key][timer_data_key])
      }
      numStats += 1;
    }
  }

  for (key in timers_lf) {
    statString += get_metric_line('timer', key, timers_lf[key])
    numStats += 1;
  }

  for (key in gauges) {
    statString += get_metric_line('gauge', key, gauges[key])
    numStats += 1;
  }

  for (key in sets) {
    statString += get_metric_line('set', key, sets[key].values().length)
    numStats += 1;
  }

  statString += get_metric_line('gauge', prefixStats + '.graphiteBackend.last_flush', graphiteStats.last_flush || 0)
  statString += get_metric_line('gauge', prefixStats + '.graphiteBackend.last_exception', graphiteStats.last_exception || 0)
  statString += get_metric_line('gauge', prefixStats + '.graphiteBackend.num_stats', numStats)
  statString += get_metric_line('timer', prefixStats + '.graphiteBackend.calculation_time', (Date.now() - starttime))

  post_stats(statString);
};

var backend_status = function graphite_status(writeCb) {
  for (var stat in graphiteStats) {
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

  events.on('flush', flush_stats);
  events.on('status', backend_status);

  return true;
};
