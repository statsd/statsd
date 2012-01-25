
var dgram      = require('dgram')
  , sys        = require('util')
  , net        = require('net')
  , config     = require('./config')
  , _          = require('underscore')
  , async      = require('async')
  , url_parse  = require('url').parse
  , https      = require('https')
  , http       = require('http');

var logger = function(message,severity){
  switch(severity){
    case "emerg":
    case "alert":
    case "crit":
    case "err":
      console.error(message);
      break;
    case "warn":
      console.warn(message);
      break;
    default:
      console.log(message);
      break;
  }
}

var counters = {};
var timers = {};
var debugInt, flushInt, server, mgmtServer;
var startup_time = Math.round(new Date().getTime() / 1000);

var globalstats = {
  graphite: {
    last_flush: startup_time,
    last_exception: startup_time
  },
  messages: {
    last_msg_seen: startup_time,
    bad_lines_seen: 0,
  }
};

process.on('uncaughtException', function (err) {
  logger('Caught exception: ' + err,"err");
});

config.configFile(process.argv[2], function (config, oldConfig) {
  if (config.debug){
    sys.log('logging to stdout/err');
  } else {
    try {
      var syslog  = require('node-syslog');
      sys.log('logging to syslog');
      syslog.init("statsd", syslog.LOG_PID | syslog.LOG_ODELAY, syslog.LOG_DAEMON);

      logger = function(message,severity){
        var severitycode = syslog.LOG_NOTICE;
        switch(severity){
          case "emerg":
            severity = syslog.LOG_EMERG;
            break;
          case "alert":
            severity = syslog.LOG_ALERT;
            break;
          case "crit":
            severity = syslog.LOG_CRIT;
            break;
          case "err":
            severity = syslog.LOG_ERR;
            break;
          case "warn":
            severity = syslog.LOG_WARN;
            break;
          case "info":
            severity = syslog.LOG_INFO;
            break;
          case "debug":
            severity = syslog.LOG_DEBUG;
            break;
        }
        syslog.log(severitycode,message);
      };
    } catch(err) {
      sys.log('node-syslog not found, logging to stdout/err');
    }
  }

  function graphServiceEnabled(name){
    switch(name){
      case "graphite":
        return (config.graphiteHost && config.graphitePort);
        break;
      default:
        throw ("'" + name + "' isn't a valid graphing service!");
        break;
    }
  }

  if (!config.debug && debugInt) {
    clearInterval(debugInt); 
    debugInt = false;
  }

  if (config.debug) {
    if (debugInt !== undefined) { clearInterval(debugInt); }
    debugInt = setInterval(function () { 
      logger("Counters:\n" + sys.inspect(counters) + "\nTimers:\n" + sys.inspect(timers), "info");
    }, config.debugInterval || 10000);
  }

  if (server === undefined) {
    server = dgram.createSocket('udp4', function (msg, rinfo) {
      var msgStr = msg.toString().replace(/^\s+|\s+$/g,"").replace(/\u0000/g, '');
      if (msgStr.length == 0) {
        if (config.debug) {
          logger('No messsages.',"debug");
        }
        return;
      }
      if (config.dumpMessages) {
        logger('Messages: ' + msgStr,"notice");
      }
      var bits = msgStr.split(':');
      var key = '';
      key = bits.shift();

      if (bits.length == 0) {
        return;
      }

      for (var i = 0; i < bits.length; i++) {
        var sampleRate = 1;
        var fields = bits[i].split("|");
        if (fields[1] === undefined) {
            logger('Bad line: ' + fields,"err");
            globalstats['messages']['bad_lines_seen']++;
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

      globalstats['messages']['last_msg_seen'] = Math.round(new Date().getTime() / 1000);
    });

    server.on("listening", function () {
      var address = server.address();
      logger("statsd is running on " + address.address + ":" + address.port,"info");
      sys.log("server is up");
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
        var stat;
        stat = stats["counters"];

        var value = counters[key];
        stat[key] = {};
        stat[key]["value"] = value;

        counters[key] = 0;

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
          stats["gauges"][key]["sum"] = sum;
          stats["gauges"][key]["sum_squares"] = sumOfSquares;
          stats["gauges"][key]["min"] = min;
          stats["gauges"][key]["max"] = max;
          if (graphServiceEnabled("graphite")){
            stats["gauges"][key]["upper_" + pctThreshold] = maxAtThreshold;
            stats["gauges"][key]["mean"] = mean;
          }

          numStats += 1;
        }
      }

      stats["counters"]["numStats"] = {};
      stats["counters"]["numStats"]["value"] = numStats;

      var slicey = function(obj,slicelen){
        var slicecounter = 0;
        var groups = _.groupBy(obj,function (num){ var ret = Math.floor(slicecounter/slicelen); slicecounter += + 1; return ret;});
        return _.map(groups,function(k,v){ return k; });
      }

      function build_hash(type){
        return function(group){
          var hash = {};
          hash[type] = {};
          _.each(group,function(metric){
            hash[type][metric] = stats[type][metric];
          });
          return hash;
        };
      }

      function hash_postprocess(inhash,service){
        switch(service){
          default:
          return inhash;
          break;
        }
      }

      function build_string(hash,type,service){
          var stats_str ='';

          switch(service){
            case "graphite":
              for (key in hash[type]){
                k =       key
                          .replace(/\s+/g, '_')
                          .replace(/\//g, '-')
                          .replace(/[^a-zA-Z_\-0-9\.]/g, '');

                var stat = hash[type][k];
                if (type == "counters"){
                  if(k == 'numStats'){
                    stats_str += 'statsd.numStats ' + stat['value'] + ' ' + ts + "\n";
                  } else {
                    var per_interval_value = stat["value"] / (flushInterval / 1000);
                    stats_str += ('stats.' + k + ' ' + per_interval_value + ' ' + ts + "\n");
                    stats_str += ('stats_counts.' + k + ' ' + stat["value"] + ' ' + ts + "\n");
                  }
                } else {
                  for (s in stat){
                    stats_str += ('stats.timers.' + k + '.' + s + ' ' + stat[s] + ' ' + ts + "\n");
                  }
                }
              }
              break;
            default:
              throw ("'" + service + "' isn't a valid graphing service!");
              break;
          }
          return stats_str;
      };

      var slice_length = config.batch || 200;
      var ggroups = slicey(_.keys(stats["gauges"]),slice_length);
      var cgroups = slicey(_.keys(stats["counters"]),slice_length);
      var ghashes = _.map(ggroups,build_hash("gauges"));
      var chashes = _.map(cgroups,build_hash("counters"));
      var combined_hashes = ghashes.concat(chashes);

      var logerror = function(e){
        if (e){
          globalstats['graphite']['last_exception'] = Math.round(new Date().getTime() / 1000);
          if(config.debug) {
            logger(e,"debug");
          }
        }
      }


      var concurrent_conns = config.maxConnections || 10;
      var submissionq = async.queue(function (task,cb){
          task();
          cb();
          },concurrent_conns);

      // only send to what is enabled
      var availableServices = ["graphite"];
      var enabledServices = _.select(availableServices,graphServiceEnabled);

      _.each(combined_hashes,function(hash){
        _.each(_.keys(hash), function(hashtype) { /* 'gauges' and 'counters' */
          _.each(enabledServices,function(service) {

            var stats_str = build_string(hash_postprocess(hash,service),hashtype,service);

            switch(service){
              case "graphite":
                submissionq.push(function(){
                  if (config.debug) {
                    logger(stats_str,"debug");
                    logger(stats_str.length,"debug");
                  }

                  try {
                    var graphite = net.createConnection(config.graphitePort, config.graphiteHost);
                    graphite.addListener('error', function(connectionException){
                      if (config.debug) {
                        logger(connectionException,"crit");
                      }
                    });
                    graphite.on('connect', function() {
                      this.write(stats_str);
                      this.end();
                      globalstats['graphite']['last_flush'] = Math.round(new Date().getTime() / 1000);
                      });
                  } catch(e){
                    if (config.debug) {
                      logger(e,"debug");
                    }
                  }
                }, logerror);
                break;

              default:
                throw ("'" + service + "' isn't a valid graphing service!");
                break;
            }
          });
        });
      });
    }, flushInterval);
  }
});
