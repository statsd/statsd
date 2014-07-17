/*jshint node:true, laxcomma:true */
'use strict';

var util = require('util');
var BackendBase = require('./base');


function ConsoleBackend(startupTime, config, emitter) {
	BackendBase.call(this, startupTime, config, emitter);
}
util.inherits(ConsoleBackend, BackendBase);

ConsoleBackend.prototype.onFlushEvent = function(timestamp, metrics) {
  console.log('Flushing stats at ', new Date(timestamp * 1000).toString());

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
    console.log(util.inspect(out, false, 5, true));
  } else {
    console.log(out);
  }

};

ConsoleBackend.prototype.onStatusEvent = function(write) {
  ['lastFlush', 'lastException'].forEach(function(key) {
    write(null, 'console', key, this[key]);
  }, this);
};

exports.init = function(startupTime, config, events) {
  new ConsoleBackend(startupTime, config, events);
  return true;
};
