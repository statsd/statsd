/*jshint node:true, laxcomma:true */

var util = require('util');
var mainwin = document;
var log = mainwin.getElementById("log");
var l;

function formatHTML(inputstring) {
    return inputstring.replace("<", "&lt;").replace(">", "&gt;").replace("&", "&amp;");
};

function display(item, top) {
    
    item = ""+item;
    var toappend = formatHTML(item);
    
    if (!! top) {
        toappend = "<h1>"+toappend+"</h1>";
    }
    else {
        toappend = "<p>"+toappend+"</p>";
    };
    
    log.innerHTML += toappend;
    
};

function clear() {
    
    log.innerHTML = "";
    display("Statistics:", true);
    
};

clear()
display("Loading...");

function AppBackend(startupTime, config, emitter){
  var self = this;
  this.lastFlush = startupTime;
  this.lastException = startupTime;
  this.config = config.console || {};

  // attach
  emitter.on('flush', function(timestamp, metrics) { self.flush(timestamp, metrics); });
  emitter.on('status', function(callback) { self.status(callback); });
}

AppBackend.prototype.flush = function(timestamp, metrics) {

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

    clear()
    display("Timestamp: "+new Date(timestamp * 1000).toString()+" (Lag: "+out.gauges["statsd.timestamp_lag"]+")");
    if (out.counters["statsd.bad_lines_seen"] > 0) {
        display("WARNING: Bad lines seen = "+out.counters["statsd/bad_lines_seen"]);
    };
    if (out.counters["statsd.packets_received"] < 1) {
        display("Waiting...");
    }
    else {
        display("Counters: "+util.inspect(out.counters, false, 5, false));
        display("Timers: "+util.inspect(out.timers, false, 5, false));
        display("Gauges: "+util.inspect(out.gauges, false, 5, false));
        display("Timer Data: "+util.inspect(out.timer_data, false, 5, false));
        display("Counter Rates: "+util.inspect(out.counter_rates, false, 5, false));
        display("Sets: "+util.inspect(out.sets, false, 5, false));
    };

};

AppBackend.prototype.status = function(write) {
  ['lastFlush', 'lastException'].forEach(function(key) {
    write(null, 'console', key, this[key]);
  }, this);
};

exports.init = function(startupTime, config, events, logger) {
  l = logger;
  var instance = new AppBackend(startupTime, config, events);
  return true;
};
