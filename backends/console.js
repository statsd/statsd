/*jshint node:true, laxcomma:true */

var util = require('util');
var lastFlush, lastException, config;

exports.init = function(startupTime, initConfig, emitter) {

  lastFlush = startupTime;
  lastException = startupTime;
  config = initConfig.console || {};

  emitter.on('flush', exports.flush);
  emitter.on('status', exports.status);

  return true;
};

exports.flush = function(timestamp, metrics) {
  console.log('Flushing stats at', new Date(timestamp * 1000).toString());

  var out = {
    counters: metrics.counters,
    timers: metrics.timers,
    gauges: metrics.gauges,
    timer_data: metrics.timer_data,
    counter_rates: metrics.counter_rates,
    sets: map(metrics.sets, function (key, val) {
      return val.values();
    }),
    pctThreshold: metrics.pctThreshold
  };

  console.log(config.prettyprint ? util.inspect(out, false, 5, true) : out);
};

exports.status = function(write) {
  write(null, 'console', 'lastFlush', lastFlush);
  write(null, 'console', 'lastException', lastException);
};

//map helper
function map(obj, fn) {
  var arr = [];
  for(var key in obj)
    arr.push(fn(key, obj[key]));
  return arr;
}
