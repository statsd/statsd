var dgram  = require('dgram')
  , util    = require('util')
  , net    = require('net')
  , config = require('./config')
  , fs     = require('fs')

var keyCounter = {};
var counters = {};
var timers = {};
var gauges = {};
var pctThreshold = null;
var backends = [];
var debugInt, flushInterval, keyFlushInt, server, mgmtServer;
var startup_time = Math.round(new Date().getTime() / 1000);

// Load and init the backend from the backends/ directory.
var loadBackend = function(config, name) {
  var backendmod = require("./backends/" + name);
  var backend = {
    name: name,
    mod: backendmod
  };

  if (config.debug) {
    util.log("Loading backend: " + name);
  }

  var ret = backendmod.init(startup_time, config);
  if (!ret) {
    util.log("Failed to load backend: " + name);
    process.exit(1);
  }

  backends.push(backend);
};

// Flush metrics to each backend.
var flushMetrics = function() {
  var ts = Math.round(new Date().getTime() / 1000);

  var metrics = {
    counters: counters,
    gauges: gauges,
    timers: timers,
    pctThreshold: pctThreshold
  }

  for (var i = 0; i < backends.length; i++) {
    backends[i].mod.flush(ts, metrics);
  }

  // Clear the counters
  for (key in counters) {
    counters[key] = 0;
  }

  // Clear the timers
  for (key in timers) {
    timers[key] = [];
  }
};

var stats = {
  messages: {
    last_msg_seen: startup_time,
    bad_lines_seen: 0,
  }
};

config.configFile(process.argv[2], function (config, oldConfig) {
  if (! config.debug && debugInt) {
    clearInterval(debugInt);
    debugInt = false;
  }

  if (config.debug) {
    if (debugInt !== undefined) { clearInterval(debugInt); }
    debugInt = setInterval(function () {
      util.log("Counters:\n" + util.inspect(counters) +
               "\nTimers:\n" + util.inspect(timers) +
               "\nGauges:\n" + util.inspect(gauges));
    }, config.debugInterval || 10000);
  }

  if (server === undefined) {

    // key counting
    var keyFlushInterval = Number((config.keyFlush && config.keyFlush.interval) || 0);

    server = dgram.createSocket('udp4', function (msg, rinfo) {
      if (config.dumpMessages) { util.log(msg.toString()); }
      var bits = msg.toString().split(':');
      var key = bits.shift()
                    .replace(/\s+/g, '_')
                    .replace(/\//g, '-')
                    .replace(/[^a-zA-Z_\-0-9\.]/g, '');

      if (keyFlushInterval > 0) {
        if (! keyCounter[key]) {
          keyCounter[key] = 0;
        }
        keyCounter[key] += 1;
      }

      if (bits.length == 0) {
        bits.push("1");
      }

      for (var i = 0; i < bits.length; i++) {
        var sampleRate = 1;
        var fields = bits[i].split("|");
        if (fields[1] === undefined) {
            util.log('Bad line: ' + fields);
            stats['messages']['bad_lines_seen']++;
            continue;
        }
        if (fields[1].trim() == "ms") {
          if (! timers[key]) {
            timers[key] = [];
          }
          timers[key].push(Number(fields[0] || 0));
        } else if (fields[1].trim() == "g") {
          gauges[key] = Number(fields[0] || 0);
        } else {
          if (fields[2] && fields[2].match(/^@([\d\.]+)/)) {
            sampleRate = Number(fields[2].match(/^@([\d\.]+)/)[1]);
          }
          if (! counters[key]) {
            counters[key] = 0;
          }
          counters[key] += Number(fields[0] || 1) * (1 / sampleRate);
        }
      }

      stats['messages']['last_msg_seen'] = Math.round(new Date().getTime() / 1000);
    });

    mgmtServer = net.createServer(function(stream) {
      stream.setEncoding('ascii');

      stream.on('data', function(data) {
        var cmdline = data.trim().split(" ");
        var cmd = cmdline.shift();

        switch(cmd) {
          case "help":
            stream.write("Commands: stats, counters, timers, gauges, delcounters, deltimers, delgauges, quit\n\n");
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
            for (group in stats) {
              for (metric in stats[group]) {
                stat_writer(group, metric, stats[group][metric]);
              }
            }

            // Retrieve stats from each backend
            for (var i = 0; i < backends.length; i++) {
              backends[i].mod.stats(function(err, stat, val) {
                if (err) {
                  util.log("Failed to read stats for backend " +
                           backends[i].name + ": " + err);
                } else {
                  stat_writer(backends[i].name, stat, val);
                }
              });
            }

            stream.write("END\n\n");
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
            for (index in cmdline) {
              delete counters[cmdline[index]];
              stream.write("deleted: " + cmdline[index] + "\n");
            }
            stream.write("END\n\n");
            break;

          case "deltimers":
            for (index in cmdline) {
              delete timers[cmdline[index]];
              stream.write("deleted: " + cmdline[index] + "\n");
            }
            stream.write("END\n\n");
            break;

          case "delgauges":
            for (index in cmdline) {
              delete gauges[cmdline[index]];
              stream.write("deleted: " + cmdline[index] + "\n");
            }
            stream.write("END\n\n");
            break;

          case "quit":
            stream.end();
            break;

          default:
            stream.write("ERROR\n");
            break;
        }

      });
    });

    server.bind(config.port || 8125, config.address || undefined);
    mgmtServer.listen(config.mgmt_port || 8126, config.mgmt_address || undefined);

    util.log("server is up");

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
      loadBackend(config, 'graphite');
    }

    // Setup the flush timer
    var flushInt = setInterval(flushMetrics, flushInterval);

    if (keyFlushInterval > 0) {
      var keyFlushPercent = Number((config.keyFlush && config.keyFlush.percent) || 100);
      var keyFlushLog = (config.keyFlush && config.keyFlush.log) || "stdout";

      keyFlushInt = setInterval(function () {
        var key;
        var sortedKeys = [];

        for (key in keyCounter) {
          sortedKeys.push([key, keyCounter[key]]);
        }

        sortedKeys.sort(function(a, b) { return b[1] - a[1]; });

        var logMessage = "";
        var timeString = (new Date()) + "";

        // only show the top "keyFlushPercent" keys
        for (var i = 0, e = sortedKeys.length * (keyFlushPercent / 100); i < e; i++) {
          logMessage += timeString + " " + sortedKeys[i][1] + " " + sortedKeys[i][0] + "\n";
        }

        var logFile = fs.createWriteStream(keyFlushLog, {flags: 'a+'});
        logFile.write(logMessage);
        logFile.end();

        // clear the counter
        keyCounter = {};
      }, keyFlushInterval);
    }

  
  ;

  }
})
