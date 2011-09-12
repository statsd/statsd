var dgram  = require('dgram')
  , sys    = require('sys')
  , net    = require('net')
  , config = require('./config')

var counters = [];
var timers = [];
var debugInt, flushInts = [], server, sserver;


String.prototype.startsWith = function(str) {
  var l = str.length;
  return this.substring(0, l) == str; 
};

String.prototype.endsWith = function(str) {
  var l = str.length;
  return this.substring(this.length - l) == str; 
};

String.prototype.removePrefix = function(str) {
  if (this.startsWith(str)) {
    return this.substring(str.length);
  }
  return this;
}

config.configFile(process.argv[2], function (config, oldConfig) {
  if (! config.debug && debugInt) {
    clearInterval(debugInt); 
    debugInt = false;
  }
                    
  if (! config.flushBuckets) {
    config.flushBuckets = [
      {
        pattern: ".*"
      , flushInterval: 10000 
      , statPrefix: "stats"
      }
    ];
  }

  if (config.debug) {
    if (debugInt !== undefined) { clearInterval(debugInt); }
    debugInt = setInterval(function () { 
      sys.log("Counters:\n" + sys.inspect(counters) + "\nTimers:\n" + sys.inspect(timers));
    }, config.debugInterval || 10000);
  }

  if (server === undefined) {
    // create the data buckets
    for (var i = 0; i < config.flushBuckets.length; i++) {
      counters.push({});
      timers.push({});
    }

    server = dgram.createSocket('udp4', function (msg, rinfo) {
      if (config.dumpMessages) { sys.log(msg.toString()); }
      var bits = msg.toString().split(':');
      var key = bits.shift()
                    .replace(/\s+/g, '_')
                    .replace(/\//g, '-')
                    .replace(/[^a-zA-Z_\-0-9\.]/g, '');
      var flushBucket = -1;    
                              
      // find the appropriate bucket
      for (var i = 0; i < config.flushBuckets.length; i++) {
        if (key.match(config.flushBuckets[i].pattern || ".*")) {
          flushBucket = i;
          break;
        }
      }
                                  
      if (flushBucket < 0) {
        sys.log("key " + key + "didn't match expected pattern\n");
        return;
      }

      if (bits.length == 0) {
        bits.push("1");
      }

      for (var i = 0; i < bits.length; i++) {
        var sampleRate = 1;
        var fields = bits[i].split("|");
        if (fields[1] === undefined) {
            sys.log('Bad line: ' + fields);
            continue;
        }
        if (fields[1].trim() == "ms") {
          if (! timers[flushBucket][key]) {
            timers[flushBucket][key] = [];
          }
          timers[flushBucket][key].push(Number(fields[0] || 0));
        } else {
          if (fields[2] && fields[2].match(/^@([\d\.]+)/)) {
            sampleRate = Number(fields[2].match(/^@([\d\.]+)/)[1]);
          }
          if (! counters[flushBucket][key]) {
            counters[flushBucket][key] = 0;
          }
          counters[flushBucket][key] += Number(fields[0] || 1) * (1 / sampleRate);
        }
      }
    });

    server.bind(config.port || 8125);

    var mkFlusher = function (flushBucket, flushInterval, statPrefix) {
      return function() {
        var statString = '';
        var ts = Math.round(new Date().getTime() / 1000);
        var numStats = 0;
        var key, tmpKey;

        for (key in counters[flushBucket]) {
          var value = counters[flushBucket][key] / (flushInterval / 1000);

          tmpKey = key.removePrefix(statPrefix).removePrefix('.');

          statString += statPrefix + '.' + tmpKey + ' ' + value + ' ' + ts + "\n";
          counters[flushBucket][key] = 0;
          numStats += 1;
        }

        for (key in timers[flushBucket]) {
          if (timers[flushBucket][key].length > 0) {
            var pctThreshold = config.percentThreshold || 90;
            var values = timers[flushBucket][key].sort(function (a,b) { return a-b; });
            var count = values.length;
            var min = values[0];
            var max = values[count - 1];

            var mean = min;
            var maxAtThreshold = max;

            if (count > 1) {
              var thresholdIndex = Math.round(((100 - pctThreshold) / 100) * count);
              var numInThreshold = count - thresholdIndex;
              values = values.slice(0, numInThreshold);
              maxAtThreshold = values[numInThreshold - 1];

              // average the remaining timings
              var sum = 0;
              for (var i = 0; i < numInThreshold; i++) {
                sum += values[i];
              }

              mean = sum / numInThreshold;
            }

            timers[flushBucket][key] = [];

            var message = "";

            tmpKey = key.removePrefix(statPrefix).removePrefix('.');

            message += statPrefix + '.timers.' + tmpKey + '.mean ' + mean + ' ' + ts + "\n";
            message += statPrefix + '.timers.' + tmpKey + '.upper ' + max + ' ' + ts + "\n";
            message += statPrefix + '.timers.' + tmpKey + '.upper_' + pctThreshold + ' ' + maxAtThreshold + ' ' + ts + "\n";
            message += statPrefix + '.timers.' + tmpKey + '.lower ' + min + ' ' + ts + "\n";
            message += statPrefix + '.timers.' + tmpKey + '.count ' + count + ' ' + ts + "\n";

            statString += message;

            numStats += 1;
          }
        }

        statString += 'statsd.numStats ' + numStats + ' ' + ts + "\n";
        
        var graphite = net.createConnection(config.graphitePort, config.graphiteHost);

        graphite.on('connect', function() {
                      this.write(statString);
                      this.end();
                    });
      };
    };
    
    // setup flushers
    for (var i = 0; i < config.flushBuckets.length; i++) {
      var flushInterval = new Number(config.flushBuckets[i].flushInterval || 10000);
      flushInts.push(setInterval(mkFlusher(i
                                         , flushInterval
                                         , config.flushBuckets[i].statPrefix)
                               , flushInterval));
    }
  }
});

