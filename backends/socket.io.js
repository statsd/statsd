
/*
 * Flush stats to socket.io sockets (http://socket.io/).
 *
 * To enable this backend, include 'socket.io' in the backends
 * configuration array:
 *
 *   backends: ['./backends/socket.io.js'']
 *
 * This backend supports the following config options:
 *
 *   socketioPort: Port to listen on.
 */

var flushInterval;

var graphiteStats = {};

var io = require('socket.io');


var flush_stats = function graphite_flush(ts, metrics) {
    var numStats = 0;
    var key;
    var stats = {perSecond: {},
                 counts: {},
                 timers: {},
                 gauges: {},
                 statsd: {},
                 timestamp: ts};

    var counters = metrics.counters;
    var gauges = metrics.gauges;
    var timers = metrics.timers;
    var pctThreshold = metrics.pctThreshold;

    for (key in counters) {
        var value = counters[key];
        var valuePerSecond = value / (flushInterval / 1000); // calculate "per second" rate
        stats.perSecond[key] = valuePerSecond;
        stats.counts[key] = value;

        numStats += 1;
    }

    for (key in timers) {
        if (timers[key].length > 0) {
            var values = timers[key].sort(function (a,b) { return a-b; });
            var count = values.length;
            var min = values[0];
            var max = values[count - 1];

            var mean = min;
            var maxAtThreshold = max;

            var message = "";

            var key2;

            stats.timers[key] = {};

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

                stats.timers[key]['mean_'+clean_pct] = mean;
                stats.timers[key]['upper_'+clean_pct] = maxAtThreshold;
            }

            stats.timers[key].upper = max;
            stats.timers[key].lower = min;
            stats.timers[key].count = count;

            numStats += 1;
        }
    }

    for (key in gauges) {
        stats.gauges[key] = gauges[key];

        numStats += 1;
    }

    stats.statsd.numStats = numStats;


    io.sockets.emit('statsd', stats);
};


exports.init = function graphite_init(startup_time, config, events) {

    io = io.listen(config.socketioPort);

    graphiteStats.last_flush = startup_time;
    graphiteStats.last_exception = startup_time;

    flushInterval = config.flushInterval;

    events.on('flush', flush_stats);
    //events.on('status', backend_status);

    return true;
};
