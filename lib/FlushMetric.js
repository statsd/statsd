var Q = require ('q')
  , pm = require('./process_metrics');

//TODO UnitTest
// Flush metrics to each backend.
function FlushMetric(config){
  this.config = config;
}
FlushMetric.prototype._clearCounters = function (metrics){
  for (var counter_key in metrics.counters) {
    if (this.config.deleteCounters) {
      if ((counter_key.indexOf("packets_received") != -1) || (counter_key.indexOf("bad_lines_seen") != -1)) {
        metrics.counters[counter_key] = 0;
      } else {
        delete(metrics.counters[counter_key]);
      }
    } else {
      metrics.counters[counter_key] = 0;
    }
  }
}

FlushMetric.prototype._clearTimers = function (metrics){
  for (var timer_key in metrics.timers) {
    if (this.config.deleteTimers) {
      delete(metrics.timers[timer_key]);
      delete(metrics.timer_counters[timer_key]);
    } else {
      metrics.timers[timer_key] = [];
      metrics.timer_counters[timer_key] = 0;
    }
  }
}

FlushMetric.prototype._clearSets = function (metrics){
  for (var set_key in metrics.sets) {
    if (this.config.deleteSets) {
      delete(metrics.sets[set_key]);
    } else {
      metrics.sets[set_key] = new set.Set();
    }
  }
}

FlushMetric.prototype._clearGauges = function (metrics){
  // normally gauges are not reset.  so if we don't delete them, continue to persist previous value
  if (this.config.deleteGauges) {
    for (var gauge_key in metrics.gauges) {
      delete(metrics.gauges[gauge_key]);
    }
  }
}

FlushMetric.prototype.clear_metrics = function (ts, metrics) {
  // single flushInterval....
  // allows us to flag all of these on with a single config but still override them individually
  return Q.allSettled([
    this._clearCounters,
    this._clearTimers,
    this._clearSets,
    this._clearGauges
  ]).done();
};

FlushMetric.prototype.filterRegex = function(){
  // filter the timers and timer_counter by the regexes provided in the config
   if (false && this.config.regex && this.config.regex.length > 0) {
     var regex;
     for (var key in metrics.timers) {
       for (var _i = 0,  _len = this.config.regex.length; _i < _len; _i++) {
         regex = this.config.regex[_i];
         if (regex.test(metrics.timers[key])){
           break;
         }
         if (_len == _i){
           delete metrics.timers[key];
           delete metrics.timer_counters[key];
         }
       }
     }
   }
}

FlushMetric.prototype.run = function(backendEvents) {
  var deferred = Q.defer();
  backendEvents.once('flush', this.clear_metrics);
  deferred.resolve(Math.round(new Date().getTime() / 1000));
  return deferred.promise;
}

FlushMetric.prototype.setMetricHash = function(counters,gauges,timers,timer_counters,sets,counter_rates,timer_data,pctThreshold,histogram){
  return {
    counters: counters,
    gauges: gauges,
    timers: timers,
    timer_counters: timer_counters,
    sets: sets,
    counter_rates: counter_rates,
    timer_data: timer_data,
    pctThreshold: pctThreshold,
    histogram: histogram
  };
}


  FlushMetric.prototype.process_metrics = function(metrics_hash, flushInterval, time_stamp) {
  var deferred = Q.defer();
  pm.process_metrics(metrics_hash, flushInterval, time_stamp, function emitFlush(metrics) {
    deferred.resolve(metrics);
  });
  return deferred.promise;
}

module.exports = FlushMetric;