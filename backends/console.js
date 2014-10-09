/*jshint node:true, laxcomma:true */

var util = require('util');

function ConsoleBackend(startupTime, config, emitter){
  var self = this;
  this.lastFlush = startupTime;
  this.lastException = startupTime;
  this.config = config.console || {};

  // attach
  emitter.on('flush', function(timestamp, metrics) { self.flush(timestamp, metrics); });
  emitter.on('status', function(callback) { self.status(callback); });
}

ConsoleBackend.prototype.flush = function(timestamp, metrics) {
  var when = new Date(timestamp * 1000).toISOString();
  var pid = process.pid;
  var worker = 'statsd';

  var out = {
    counters: metrics.counters,
    timers: metrics.timers,
    gauges: metrics.gauges,
    timer_data: metrics.timer_data,
    counter_rates: metrics.counter_rates,
    sets: function (vals) {
      var ret = {};
      for (var val in vals) {
        ret[val] = vals[val].values();
      }
      return ret;
    }(metrics.sets),
    pctThreshold: metrics.pctThreshold
  };

  if(this.config.prettyprint) {
    out = util.inspect(out, {depth: 5, colors: true});
    console.log('%s pid:%d worker:%s stats=\n', when, pid, worker, out);
  } else {
    console.log('%s pid:%d worker:%s stats=%j', when, pid, worker, out);
  }

};

ConsoleBackend.prototype.status = function(write) {
  ['lastFlush', 'lastException'].forEach(function(key) {
    write(null, 'console', key, this[key]);
  }, this);
};

exports.init = function(startupTime, config, events) {
  var instance = new ConsoleBackend(startupTime, config, events);
  return true;
};
