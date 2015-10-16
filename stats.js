/*jshint node:true, laxcomma:true */
'use strict';

var util    = require('util')
  , net    = require('net')
  , config = require('./lib/config')
  , helpers = require('./lib/helpers')
  , fs     = require('fs')
  , events = require('events')
  , logger = require('./lib/logger')
  , set = require('./lib/set')
  , pm = require('./lib/process_metrics')
  , process_mgmt = require('./lib/process_mgmt')
  , MgmtServer = require('./lib/mgmt_console');

// initialize data structures with defaults for statsd stats
var metricsHash = {
  counters: {},
  timers: {},
  timer_counters: {},
  gauges: {},
  sets: {},
  counter_rates: {},
  timer_data: {},
  pctThreshold: null,
  histogram: null
};

var keyCounter = {};
var counters = {};
var timers = {};
var timer_counters = {};
var gauges = {};
var sets = {};
var counter_rates = {};
var timer_data = {};
var pctThreshold = null;
var flushInterval, keyFlushInt, serversLoaded, mgmtServer;
var startup_time = Math.round(new Date().getTime() / 1000);
var backendEvents = new events.EventEmitter();
var healthStatus = config.healthStatus || 'up';
var old_timestamp = 0;
var timestamp_lag_namespace;
var keyNameSanitize = true;

// global stats updated by stats.js, consumed by MgmtServer
var stats = {
  startup_time: startup_time,
  messages: {
    last_msg_seen: startup_time,
    bad_lines_seen: 0
  }
};

// Load and init the backend from the backends/ directory.
function loadBackend(config, name) {
  var backendmod = require(name);

  if (config.debug) {
    l.log("Loading backend: " + name, 'DEBUG');
  }

  var ret = backendmod.init(stats.startup_time, config, backendEvents, l);
  if (!ret) {
    l.log("Failed to load backend: " + name, 'ERROR');
    process.exit(1);
  }
}

// Load and init the server from the servers/ directory.
// The callback mimics the dgram 'message' event parameters (msg, rinfo)
//   msg: the message received by the server. may contain more than one metric
//   rinfo: contains remote address information and message length
//      (attributes are .address, .port, .family, .size - you're welcome)
function startServer(config, name, callback) {
  var servermod = require(name);

  if (config.debug) {
    l.log("Loading server: " + name, 'DEBUG');
  }

  var ret = servermod.start(config, callback);
  if (!ret) {
    l.log("Failed to load server: " + name, 'ERROR');
    process.exit(1);
  }
}

// global for conf
var conf;

// Flush metrics to each backend.
function flushMetrics() {
  var time_stamp = Math.round(new Date().getTime() / 1000);
  if (old_timestamp > 0) {
    gauges[timestamp_lag_namespace] = (time_stamp - old_timestamp - (Number(conf.flushInterval)/1000));
  }
  old_timestamp = time_stamp;

  // TODO: This is not the place for this.
  metricsHash.histogram = conf.histogram;

  // After all listeners, reset the stats
  backendEvents.once('flush', function clear_metrics(ts, metrics) {
    // TODO: a lot of this should be moved up into an init/constructor so we don't have to do it every
    // single flushInterval....
    // allows us to flag all of these on with a single config but still override them individually
    conf.deleteIdleStats = conf.deleteIdleStats !== undefined ? conf.deleteIdleStats : false;
    if (conf.deleteIdleStats) {
      conf.deleteCounters = conf.deleteCounters !== undefined ? conf.deleteCounters : true;
      conf.deleteTimers = conf.deleteTimers !== undefined ? conf.deleteTimers : true;
      conf.deleteSets = conf.deleteSets !== undefined ? conf.deleteSets : true;
      conf.deleteGauges = conf.deleteGauges !== undefined ? conf.deleteGauges : true;
    }

    // Clear the counters
    conf.deleteCounters = conf.deleteCounters || false;
    for (var counter_key in metrics.counters) {
      if (conf.deleteCounters) {
        if ((counter_key.indexOf("packets_received") != -1) ||
            (counter_key.indexOf("metrics_received") != -1) ||
            (counter_key.indexOf("bad_lines_seen") != -1)) {
          metrics.counters[counter_key] = 0;
        } else {
         delete(metrics.counters[counter_key]);
        }
      } else {
        metrics.counters[counter_key] = 0;
      }
    }

    // Clear the timers
    conf.deleteTimers = conf.deleteTimers || false;
    for (var timer_key in metrics.timers) {
      if (conf.deleteTimers) {
        delete(metrics.timers[timer_key]);
        delete(metrics.timer_counters[timer_key]);
      } else {
        metrics.timers[timer_key] = [];
        metrics.timer_counters[timer_key] = 0;
     }
    }

    // Clear the sets
    conf.deleteSets = conf.deleteSets || false;
    for (var set_key in metrics.sets) {
      if (conf.deleteSets) {
        delete(metrics.sets[set_key]);
      } else {
        metrics.sets[set_key] = new set.Set();
      }
    }

	// normally gauges are not reset.  so if we don't delete them, continue to persist previous value
    conf.deleteGauges = conf.deleteGauges || false;
    if (conf.deleteGauges) {
      for (var gauge_key in metrics.gauges) {
        delete(metrics.gauges[gauge_key]);
      }
    }
  });

  pm.process_metrics(metricsHash, flushInterval, time_stamp, function emitFlush(metrics) {
    backendEvents.emit('flush', time_stamp, metrics);
  });

}

function sanitizeKeyName(key) {
  if (keyNameSanitize) {
    return key.replace(/\s+/g, '_')
              .replace(/\//g, '-')
              .replace(/[^a-zA-Z_\-0-9\.]/g, '');
  } else {
    return key;
  }
}

// Global for the logger
var l;

config.configFile(process.argv[2], function (config) {
  conf = config;

  process_mgmt.init(config);

  if (typeof l === 'undefined') {
    l = new logger.Logger(config.log || {});
  } else {
    l.setConfig(config);
  }

  if (typeof mgmtServer === 'undefined') {
    mgmtServer = new MgmtServer({
      config: config,
      l: l,
      backendEvents: backendEvents,
      healthStatus: healthStatus,
      stats: stats,
      metricsHash: metricsHash
    });
    mgmtServer.start();
  } else {
    mgmtServer.stop();
    mgmtServer.setConfig(config);
    mgmtServer.init();
    mgmtServer.start();
  }

  // setup config for stats prefix
  var prefixStats = config.prefixStats;
  prefixStats = prefixStats !== undefined ? prefixStats : "statsd";
  //setup the names for the stats stored in counters{}
  var bad_lines_seen   = prefixStats + ".bad_lines_seen";
  var packets_received = prefixStats + ".packets_received";
  var metrics_received = prefixStats + ".metrics_received";
  timestamp_lag_namespace = prefixStats + ".timestamp_lag";

  //now set to zero so we can increment them
  metricsHash.counters[bad_lines_seen]   = 0;
  metricsHash.counters[packets_received] = 0;
  metricsHash.counters[metrics_received] = 0;

  if (config.keyNameSanitize !== undefined) {
    keyNameSanitize = config.keyNameSanitize;
  }
  if (!serversLoaded) {

    // key counting
    var keyFlushInterval = Number((config.keyFlush && config.keyFlush.interval) || 0);
    var metrics;

    var handlePacket = function (msg, rinfo) {
      backendEvents.emit('packet', msg, rinfo);
      metricsHash.counters[packets_received]++;
      var packet_data = msg.toString();
      if (packet_data.indexOf("\n") > -1) {
        metrics = packet_data.split("\n");
      } else {
        metrics = [ packet_data ] ;
      }

      for (var midx in metrics) {
        if (metrics[midx].length === 0) {
          continue;
        }

        metricsHash.counters[metrics_received]++;
        if (config.dumpMessages) {
          l.log(metrics[midx].toString());
        }
        var bits = metrics[midx].toString().split(':');
        var key = sanitizeKeyName(bits.shift());

        if (keyFlushInterval > 0) {
          if (! keyCounter[key]) {
            keyCounter[key] = 0;
          }
          keyCounter[key] += 1;
        }

        if (bits.length === 0) {
          bits.push("1");
        }

        for (var i = 0; i < bits.length; i++) {
          var sampleRate = 1;
          var fields = bits[i].split("|");
          if (!helpers.is_valid_packet(fields)) {
              l.log('Bad line: ' + fields + ' in msg "' + metrics[midx] +'"');
              metricsHash.counters[bad_lines_seen]++;
              stats.messages.bad_lines_seen++;
              continue;
          }
          if (fields[2]) {
            sampleRate = Number(fields[2].match(/^@([\d\.]+)/)[1]);
          }

          var metric_type = fields[1].trim();
          if (metric_type === "ms") {
            if (! timers[key]) {
              metricsHash.timers[key] = [];
              metricsHash.timer_counters[key] = 0;
            }
            metricsHash.timers[key].push(Number(fields[0] || 0));
            metricsHash.timer_counters[key] += (1 / sampleRate);
          } else if (metric_type === "g") {
            if (gauges[key] && fields[0].match(/^[-+]/)) {
              metricsHash.gauges[key] += Number(fields[0] || 0);
            } else {
              metricsHash.gauges[key] = Number(fields[0] || 0);
            }
          } else if (metric_type === "s") {
            if (! sets[key]) {
              metricsHash.sets[key] = new set.Set();
            }
            metricsHash.sets[key].insert(fields[0] || '0');
          } else {
            if (! metricsHash.counters[key]) {
              metricsHash.counters[key] = 0;
            }
            metricsHash.counters[key] += Number(fields[0] || 1) * (1 / sampleRate);
          }
        }
      }

      stats.messages.last_msg_seen = Math.round(new Date().getTime() / 1000);
    };

    // If config.servers isn't specified, use the top-level config for backwards-compatibility
    var server_config = config.servers || [config];
    for (var i = 0; i < server_config.length; i++) {
      // The default server is UDP
      var server = server_config[i].server || './servers/udp';
      startServer(server_config[i], server, handlePacket);
    }
    serversLoaded = true;

    l.log("server is up", "INFO");

    pctThreshold = config.percentThreshold || 90;
    if (!Array.isArray(pctThreshold)) {
      pctThreshold = [ pctThreshold ]; // listify percentiles so single values work the same
    }

    flushInterval = Number(config.flushInterval || 10000);
    config.flushInterval = flushInterval;

    if (config.backends) {
      for (var i = 0; i < config.backends.length; i++) {
        loadBackend(config, config.backends[i]);
      }
    } else {
      // The default backend is graphite
      loadBackend(config, './backends/graphite');
    }

    // Setup the flush timer
    var flushInt = setInterval(flushMetrics, flushInterval);

    if (keyFlushInterval > 0) {
      var keyFlushPercent = Number((config.keyFlush && config.keyFlush.percent) || 100);
      var keyFlushLog = config.keyFlush && config.keyFlush.log;

      keyFlushInt = setInterval(function () {
        var sortedKeys = [];

        for (var key in keyCounter) {
          sortedKeys.push([key, keyCounter[key]]);
        }

        sortedKeys.sort(function(a, b) { return b[1] - a[1]; });

        var logMessage = "";
        var timeString = (new Date()) + "";

        // only show the top "keyFlushPercent" keys
        for (var i = 0, e = sortedKeys.length * (keyFlushPercent / 100); i < e; i++) {
          logMessage += timeString + " count=" + sortedKeys[i][1] + " key=" + sortedKeys[i][0] + "\n";
        }

        if (keyFlushLog) {
          var logFile = fs.createWriteStream(keyFlushLog, {flags: 'a+'});
          logFile.write(logMessage);
          logFile.end();
        } else {
          process.stdout.write(logMessage);
        }

        // clear the counter
        keyCounter = {};
      }, keyFlushInterval);
    }
  }
});

process.on('exit', function () {
  flushMetrics();
});
