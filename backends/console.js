var util = require('util');

function ConsoleBackend(startupTime, config, emitter){
  var self = this;
  this.lastFlush = startupTime;
  this.lastException = startupTime;
  this.config = config.console || {};

  this.statsCache = {
    counters: {},
    timers: {}
  };

  // attach
  emitter.on('flush', function(timestamp, metrics) { self.flush(timestamp, metrics); });
  emitter.on('status', function(callback) { self.status(callback); });
};

ConsoleBackend.prototype.flush = function(timestamp, metrics) {
  var self = this;
  console.log('Flushing stats at', new Date(timestamp * 1000).toString());

  // merge with previously sent values
  Object.keys(self.statsCache).forEach(function(type) {
    if(!metrics[type]) return;
    Object.keys(metrics[type]).forEach(function(name) {
      var value = metrics[type][name];
      self.statsCache[type][name] || (self.statsCache[type][name] = 0);
      self.statsCache[type][name] += value;
    });
  });

  var out = {
    counter: this.statsCache.counters,
    timers: this.statsCache.timers,
    gauges: metrics.gauges,
    pctThreshold: metrics.pctThreshold
  };

  if(this.config.prettyprint) {
    console.log(util.inspect(out, false, 5, true));
  } else {
    console.log(out);
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
