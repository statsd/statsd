var dgram      = require('dgram')
  , sys        = require('sys')
  , net        = require('net')
  , config     = require('./config')
  , base64     = require('base64')
  , https      = require('https');


var counters = {};
var timers = {};
var debugInt, flushInt, server, mgmtServer;
var startup_time = Math.round(new Date().getTime() / 1000);

var stats = {
  graphite: {
    last_flush: startup_time,
    last_exception: startup_time
  },
  messages: {
    last_msg_seen: startup_time,
    bad_lines_seen: 0,
  }
};
var modulus = Math.pow(2,32);

config.configFile(process.argv[2], function (config, oldConfig) {
  if (! config.debug && debugInt) {
    clearInterval(debugInt); 
    debugInt = false;
  }

  if (config.debug) {
    if (debugInt !== undefined) { clearInterval(debugInt); }
    debugInt = setInterval(function () { 
      sys.log("Counters:\n" + sys.inspect(counters) + "\nTimers:\n" + sys.inspect(timers));
    }, config.debugInterval || 10000);
  }

  if (server === undefined) {
    server = dgram.createSocket('udp4', function (msg, rinfo) {
      if (config.dumpMessages) { sys.log(msg.toString()); }
      var bits = msg.toString().split(':');
      var key = '';
      if ((config.graphService) && (config.graphService == "librato-metrics")){
        key = bits.shift()
                  .replace(/\s+/g, '_')
                  .replace(/\.\//g, '-')
                  .replace(/[^a-zA-Z_\-0-9]/g, '');
      } else {
        key = bits.shift()
                  .replace(/\s+/g, '_')
                  .replace(/\//g, '-')
                  .replace(/[^a-zA-Z_\-0-9\.]/g, '');
      }

      if (bits.length == 0) {
        bits.push("1");
      }

      for (var i = 0; i < bits.length; i++) {
        var sampleRate = 1;
        var fields = bits[i].split("|");
        if (fields[1] === undefined) {
            sys.log('Bad line: ' + fields);
            stats['messages']['bad_lines_seen']++;
            continue;
        }
        if (fields[1].trim() == "ms") {
          if (! timers[key]) {
            timers[key] = [];
          }
          timers[key].push(Number(fields[0] || 0));
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
        var cmd = data.trim();

        switch(cmd) {
          case "help":
            stream.write("Commands: stats, counters, timers, quit\n\n");
            break;

          case "stats":
            var now    = Math.round(new Date().getTime() / 1000);
            var uptime = now - startup_time;

            stream.write("uptime: " + uptime + "\n");

            for (group in stats) {
              for (metric in stats[group]) {
                var val;

                if (metric.match("^last_")) {
                  val = now - stats[group][metric];
                }
                else {
                  val = stats[group][metric];
                }

                stream.write(group + "." + metric + ": " + val + "\n");
              }
            }
            stream.write("END\n\n");
            break;

          case "counters":
            stream.write(sys.inspect(counters) + "\n");
            stream.write("END\n\n");
            break;

          case "timers":
            stream.write(sys.inspect(timers) + "\n");
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

    server.bind(config.port || 8125);
    mgmtServer.listen(config.mgmt_port || 8126);

    var flushInterval = Number(config.flushInterval || 10000);

    flushInt = setInterval(function () {
      var stats = {};
      stats["gauges"] = {};
      stats["counters"] = {};
      var ts = Math.round(new Date().getTime() / 1000);
      var numStats = 0;
      var key;

      for (key in counters) {
        stats["counters"][key] = {};
        if ((config.graphService) && (config.graphService == "librato-metrics")){
          counters[key] = counters[key] % modulus;
          stats["counters"][key]["value"] = counters[key];
        } else {
          var value = counters[key] / (flushInterval / 1000);
          stats["counters"][key]["value"] = value;
        }

        if ((config.graphService) && (config.graphService == "librato-metrics")){
        } else {
          counters[key] = 0;
        }

        numStats += 1;
      }

      for (key in timers) {
        if (timers[key].length > 0) {
          var pctThreshold = config.percentThreshold || 90;
          var values = timers[key].sort(function (a,b) { return a-b; });
          var count = values.length;
          var min = values[0];
          var max = values[count - 1];

          var mean = min;
          var maxAtThreshold = max;

          if (count > 1) {
            var thresholdIndex = Math.round(((100 - pctThreshold) / 100) * count);
            var numInThreshold = count - thresholdIndex;
            values_sliced = values.slice(0, numInThreshold);
            maxAtThreshold = values_sliced[numInThreshold - 1];
            // average the remaining timings
            var sum = 0;
            for (var i = 0; i < numInThreshold; i++) {
              sum += values_sliced[i];
            }
            mean = sum / numInThreshold;
          }

          var sum = 0;
          var sumOfSquares = 0;
          for (var i = 0; i < count; i++) {
            sum += values[i];
            sumOfSquares += values[i] * values[i];
          }

          timers[key] = [];
          stats["gauges"][key] = {};
          stats["gauges"][key]["count"] = count;
          stats["gauges"][key]["sum_squares"] = sumOfSquares;
          stats["gauges"][key]["upper_" + pctThreshold] = maxAtThreshold;
          stats["gauges"][key]["sum"] = sum;
          stats["gauges"][key]["min"] = min;
          stats["gauges"][key]["max"] = max;

          numStats += 1;
        }
      }

      stats["counters"]["numStats"] = {};
      stats["counters"]["numStats"]["value"] = numStats;


      var stats_str ='';
      
      if ((config.graphService) && (config.graphService == "librato-metrics")){
        stats_str = JSON.stringify(stats);
      } else {
        for (k in stats["counters"]){
          var stat = stats["counters"][k];
          var per_interval_value = stat["value"] / (flushInterval / 1000);
          stats_str += ('stats.' + k + ' ' + per_interval_value + ' ' + ts + "\n");
          stats_str += ('stats_counts.' + k + ' ' + stat["value"] + ' ' + ts + "\n");
        }
        for (k in stats["gauges"]){
          var stat = stats["gauges"][k];
          for (s in stat){
            stats_str += ('stats.timers.' + k + '.' + s + ' ' + stat[s] + ' ' + ts + "\n");
          }
        }
      }

      if (config.debug) {
        sys.log(stats_str);
        sys.log(stats_str.length);
      }

      if ((config.graphService) && (config.graphService == "librato-metrics")){
        var options = {
          host: 'metrics-api.librato.com',
          port: 443,
          path: '/v1/metrics.json',
          method: 'POST',
          headers: {
            "Authorization": 'Basic ' + base64.encode(new Buffer(config.libratoUser + ':' + config.libratoApiKey)),
            "Content-Length": stats_str.length,
            "Content-Type": "application/json"
          }
        };

        var req = https.request(options, function(res) {
          res.on('data', function(d) {
            process.stdout.write(d);
          });
        });
        req.write(stats_str);
        req.end();
        stats['graphite']['last_flush'] = Math.round(new Date().getTime() / 1000);

        req.on('error', function(e) {
          sys.log("There was an error");
          sys.log(e);
        });
      } else {
        try {
          var graphite = net.createConnection(config.graphitePort, config.graphiteHost);
          graphite.addListener('error', function(connectionException){
              if (config.debug) {
                sys.log(connectionException);
              }
          });
          graphite.on('connect', function() {
              this.write(stats_str);
              this.end();
              stats['graphite']['last_flush'] = Math.round(new Date().getTime() / 1000);
              });
        } catch(e){
          if (config.debug) {
            sys.log(e);
          }
        }
        stats['graphite']['last_exception'] = Math.round(new Date().getTime() / 1000);
      }
    }, flushInterval);
  }

});

