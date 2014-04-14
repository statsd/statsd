/*jshint node:true, laxcomma:true */

var dgram  = require('dgram')
  , util    = require('util')
  , net    = require('net')
  , config = require('./lib/config')
  , helpers = require('./lib/helpers')
  , fs     = require('fs')
  , events = require('events')
  , logger = require('./lib/logger')
  , set = require('./lib/set')
  , process_mgmt = require('./lib/process_mgmt')
  , mgmt = require('./lib/mgmt_console')
  , Q = require('q');

// initialize data structures with defaults for statsd stats
var keyCounter = {}
  , counters = {}
  , timers = {}
  , timer_counters = {}
  , gauges = {}
  , sets = {}
  , counter_rates = {}
  , timer_data = {}
  , pctThreshold = null
  , flushInterval, keyFlushInt, server
  , startup_time = Math.round(new Date().getTime() / 1000)
  , backendEvents = new events.EventEmitter()
  , healthStatus = config.healthStatus || 'up'
  , old_timestamp = 0
  , timestamp_lag_namespace
  , flushMetric;


var stats = {
  messages: {
    last_msg_seen: startup_time,
    bad_lines_seen: 0
  }
};

// Global for the logger
var l;

// global for conf
var conf;

var Init = require('./lib/Init.js')
  , Server = require('./lib/Server.js')
  , FlushMetric = require('./lib/FlushMetric.js');

// TODO modularize
function flushMetrics() {
  flushMetric.run(backendEvents)
    .then(function(time_stamp){
      if (old_timestamp > 0) {
        gauges[timestamp_lag_namespace] = (time_stamp - old_timestamp - (Number(conf.flushInterval)/1000));
      }
      old_timestamp = time_stamp;
      return time_stamp;
    }).then(function(time_stamp){
      return [
        flushMetric.setMetricHash(counters,gauges,timers,timer_counters,sets,counter_rates,timer_data,pctThreshold,conf.histogram),
        time_stamp
      ];
    })
    .spread(function(metrics_hash, time_stamp){
      return [flushMetric.process_metrics(metrics_hash, flushInterval, time_stamp), time_stamp];
    })
    .spread(function(metrics, time_stamp){
      backendEvents.emit('flush', time_stamp, metrics);
    }).done();
}

var setGlobalVars = function (promise){
  return Q.when(promise, function(config){
    // setup config for stats prefix
    prefixStats = config.prefixStats;
    prefixStats = prefixStats !== undefined ? prefixStats : "statsd";
    //setup the names for the stats stored in counters{}
    bad_lines_seen   = prefixStats + ".bad_lines_seen";
    packets_received = prefixStats + ".packets_received";
    config.timestamp_lag_namespace = prefixStats + ".timestamp_lag";

    //now set to zero so we can increment them
    counters[bad_lines_seen]   = 0;
    counters[packets_received] = 0;

    process_mgmt.init(config);
    l = new logger.Logger(config.log || {});
    // makes the config globally accesseble

    flushMetric = new FlushMetric(config);
    pctThreshold = config.percentThreshold;
    timestamp_lag_namespace = config.timestamp_lag_namespace
    conf = config;
    return config;
  });
};

var _hasntServer = function (promise){
  return Q.when(promise, function(config){
    if (server === undefined) {
      return config;
    }else{
      throw new Error('you defined an server already');
    }
  });
};

// Load and init the backend from the backends/ directory.
var _loadBackend = function (config, name) {
  var backendmod = require(name);

  if (config.debug) {
    l.log("Loading backend: " + name, 'DEBUG');
  }

  var ret = backendmod.init(startup_time, config, backendEvents, l);
  if (!ret) {
    l.log("Failed to load backend: " + name);
    process.exit(1);
  }

};

var _setBackend = function(config){
  if (config.backends) {
    for (var i = 0; i < config.backends.length; i++) {
      _loadBackend(config, config.backends[i]);
    }
  } else {
    // The default backend is graphite
    _loadBackend(config, './backends/graphite');
  }
};

var _setKeyFlush = function(config){
  if (config.keyFlushInterval > 0) {
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
    }, config.keyFlushInterval);
  }
};

var setBackEnd = function (config){
  flushInterval = Number(config.flushInterval || 10000);
  config.flushInterval = flushInterval;

  return Q.all([
    _setBackend(config),
    _setKeyFlush(config)
  ]);
};

// TODO methode should be in FlushMetric
var _flushMetrics = function(config){
  /* TODO
    event.on \flush
      flushMetrick.run()
      .delay config.flushInterval
      .then ->
        event.emit \flush
      .done()
   */
  setInterval(
    function () {
      flushMetric.run(backendEvents)
        .then(function(time_stamp){
          if (old_timestamp > 0) {
            gauges[timestamp_lag_namespace] = (time_stamp - old_timestamp - (Number(conf.flushInterval)/1000));
          }
          old_timestamp = time_stamp;
          return time_stamp;
        }).then(function(time_stamp){
          return [
            flushMetric.setMetricHash(counters,gauges,timers,timer_counters,sets,counter_rates,timer_data,pctThreshold,conf.histogram),
            time_stamp
          ];
        })
        .spread(function(metrics_hash, time_stamp){
          return [flushMetric.process_metrics(metrics_hash, flushInterval, time_stamp), time_stamp];
        })
        .spread(function(metrics, time_stamp){
          backendEvents.emit('flush', time_stamp, metrics);
        }).done();
    }, config.flushInterval);
};

//TODO  inherit from Server

var runServer = function(config){
  return dgram.createSocket(config.udp_version, function (msg, rinfo) {
    backendEvents.emit('packet', msg, rinfo);
    counters[packets_received]++;
    var packet_data = msg.toString();
    if (packet_data.indexOf("\n") > -1) {
      var metrics = packet_data.split("\n");
    } else {
      var metrics = [ packet_data ] ;
    }

    for (var midx in metrics) {
      if (metrics[midx].length === 0) {
        continue;
      }
      if (config.dumpMessages) {
        l.log(metrics[midx].toString());
      }
      var bits = metrics[midx].toString().split(':');
      var key = bits.shift()
        .replace(/\s+/g, '_')
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z_\-0-9\.]/g, '');

      if (config.keyFlushInterval > 0) {
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
          counters[bad_lines_seen]++;
          stats.messages.bad_lines_seen++;
          continue;
        }
        if (fields[2]) {
          sampleRate = Number(fields[2].match(/^@([\d\.]+)/)[1]);
        }

        var metric_type = fields[1].trim();
        if (metric_type === "ms") {
          if (! timers[key]) {
            timers[key] = [];
            timer_counters[key] = 0;
          }
          timers[key].push(Number(fields[0] || 0));
          timer_counters[key] += (1 / sampleRate);
        } else if (metric_type === "g") {
          if (gauges[key] && fields[0].match(/^[-+]/)) {
            gauges[key] += Number(fields[0] || 0);
          } else {
            gauges[key] = Number(fields[0] || 0);
          }
        } else if (metric_type === "s") {
          if (! sets[key]) {
            sets[key] = new set.Set();
          }
          sets[key].insert(fields[0] || '0');
        } else {
          if (! counters[key]) {
            counters[key] = 0;
          }
          counters[key] += Number(fields[0] || 1) * (1 / sampleRate);
        }
      }
    }

    stats.messages.last_msg_seen = Math.round(new Date().getTime() / 1000);
  })
}

var runServerMgmt = function(config){
  return net.createServer(function(stream) {
  stream.setEncoding('ascii');

  stream.on('error', function(err) {
    l.log('Caught ' + err +', Moving on');
  });

  stream.on('data', function(data) {
    var cmdline = data.trim().split(" ");
    var cmd = cmdline.shift();

    switch(cmd) {
      case "help":
        stream.write("Commands: stats, counters, timers, gauges, delcounters, deltimers, delgauges, health, quit\n\n");
        break;

      case "health":
        if (cmdline.length > 0) {
          var cmdaction = cmdline[0].toLowerCase();
          if (cmdaction === 'up') {
            healthStatus = 'up';
          } else if (cmdaction === 'down') {
            healthStatus = 'down';
          }
        }
        stream.write("health: " + healthStatus + "\n");
        break;

      case "stats":
        var now    = Math.round(new Date().getTime() / 1000);
        var uptime = now - startup_time;

        stream.write("uptime: " + uptime + "\n");

        var stat_writer = function(group, metric, val) {
          var delta;

          if (metric.match("^last_")) {
            delta = now - val;
          }
          else {
            delta = val;
          }

          stream.write(group + "." + metric + ": " + delta + "\n");
        };

        // Loop through the base stats
        for (var group in stats) {
          for (var metric in stats[group]) {
            stat_writer(group, metric, stats[group][metric]);
          }
        }

        backendEvents.once('status', function(writeCb) {
          stream.write("END\n\n");
        });

        // Let each backend contribute its status
        backendEvents.emit('status', function(err, name, stat, val) {
          if (err) {
            l.log("Failed to read stats for backend " +
              name + ": " + err);
          } else {
            stat_writer(name, stat, val);
          }
        });

        break;

      case "counters":
        stream.write(util.inspect(counters) + "\n");
        stream.write("END\n\n");
        break;

      case "timers":
        stream.write(util.inspect(timers) + "\n");
        stream.write("END\n\n");
        break;

      case "gauges":
        stream.write(util.inspect(gauges) + "\n");
        stream.write("END\n\n");
        break;

      case "delcounters":
        mgmt.delete_stats(counters, cmdline, stream);
        break;

      case "deltimers":
        mgmt.delete_stats(timers, cmdline, stream);
        break;

      case "delgauges":
        mgmt.delete_stats(gauges, cmdline, stream);
        break;

      case "quit":
        stream.end();
        break;

      default:
        stream.write("ERROR\n");
        break;
    }

  });
})
}

Server.prototype.run = function(promise){
  return Q.when(promise, function(config){
    return  _hasntServer(config)
      .then(function(config) {
        Q.all([
            runServer(config),
            runServerMgmt(config)
          ]).spread(function(server, mgmtServer){
            server.bind(config.port || 8125, config.address || undefined);
            mgmtServer.listen(config.mgmt_port || 8126, config.mgmt_address || undefined);
            util.log("server is up");
          });
        return config;
      });
  });
}

Init.prototype.server = new Server(server);
var init = new Init();

backendEvents.once('main',function (){
  init.run()
  .then(setGlobalVars)
  .then(init.server.run)
  .then(setBackEnd)
  .then(_flushMetrics)
  .catch(function(error){
    console.log(error);
  })
  .done();
});

backendEvents.emit('main');

process.on('exit', function () {
  flushMetrics();
});
