var pm = require('../lib/processedmetrics')
var time_stamp = Math.round(new Date().getTime() / 1000);

var counters = {};
var gauges = {};
var timers = {};
var sets = {};
var pctThreshold = null;

var metrics = {
  counters: counters,
  gauges: gauges,
  timers: timers,
  sets: sets,
  pctThreshold: pctThreshold
}

module.exports = {
  counters_has_stats_count: function(test) {
    test.expect(1);
    metrics.counters['a'] = 2;
    var processed_metrics = new pm.ProcessedMetrics(metrics, 1000);
    test.equal(2, processed_metrics.counters['a']);
    test.done();
  },
  counters_has_correct_rate: function(test) {
    test.expect(1);
    metrics.counters['a'] = 2;
    var processed_metrics = new pm.ProcessedMetrics(metrics, 100);
    test.equal(20, processed_metrics.counter_rates['a']);
    test.done();
  },
  timers_handle_empty: function(test) {
    test.expect(1);
    metrics.timers['a'] = [];
    var processed_metrics = new pm.ProcessedMetrics(metrics, 100);
    test.equal(20, processed_metrics.counter_rates['a']);
    test.done();
  },
  timers_single_time: function(test) {
    test.expect(6);
    metrics.timers['a'] = [100];
    var processed_metrics = new pm.ProcessedMetrics(metrics, 100);
    timer_data = processed_metrics.timer_data['a'];
    test.equal(0, timer_data.std);
    test.equal(100, timer_data.upper);
    test.equal(100, timer_data.lower);
    test.equal(1, timer_data.count);
    test.equal(100, timer_data.sum);
    test.equal(100, timer_data.mean);
    test.done();
  },
    timers_multiple_times: function(test) {
    test.expect(6);
    metrics.timers['a'] = [100, 200, 300];
    var processed_metrics = new pm.ProcessedMetrics(metrics, 100);
    timer_data = processed_metrics.timer_data['a'];
    test.equal(81.64965809277261, timer_data.std);
    test.equal(300, timer_data.upper);
    test.equal(100, timer_data.lower);
    test.equal(3, timer_data.count);
    test.equal(600, timer_data.sum);
    test.equal(200, timer_data.mean);
    test.done();
  },
    timers_single_time_single_percentile: function(test) {
    test.expect(3);
    metrics.timers['a'] = [100];
    metrics.pctThreshold = [90];
    var processed_metrics = new pm.ProcessedMetrics(metrics, 100);
    timer_data = processed_metrics.timer_data['a'];
    test.equal(100, timer_data.mean_90);
    test.equal(100, timer_data.upper_90);
    test.equal(100, timer_data.sum_90);
    test.done();
  },
    timers_single_time_multiple_percentiles: function(test) {
    test.expect(6);
    metrics.timers['a'] = [100];
    metrics.pctThreshold = [90, 80];
    var processed_metrics = new pm.ProcessedMetrics(metrics, 100);
    timer_data = processed_metrics.timer_data['a'];
    test.equal(100, timer_data.mean_90);
    test.equal(100, timer_data.upper_90);
    test.equal(100, timer_data.sum_90);
    test.equal(100, timer_data.mean_80);
    test.equal(100, timer_data.upper_80);
    test.equal(100, timer_data.sum_80);
    test.done();
  },
    timers_multiple_times_single_percentiles: function(test) {
    test.expect(3);
    metrics.timers['a'] = [100, 200, 300];
    metrics.pctThreshold = [90];
    var processed_metrics = new pm.ProcessedMetrics(metrics, 100);
    timer_data = processed_metrics.timer_data['a'];
    test.equal(200, timer_data.mean_90);
    test.equal(300, timer_data.upper_90);
    test.equal(600, timer_data.sum_90);
    test.done();
  },
    timers_multiple_times_multiple_percentiles: function(test) {
    test.expect(6);
    metrics.timers['a'] = [100, 200, 300];
    metrics.pctThreshold = [90, 80];
    var processed_metrics = new pm.ProcessedMetrics(metrics, 100);
    timer_data = processed_metrics.timer_data['a'];
    test.equal(200, timer_data.mean_90);
    test.equal(300, timer_data.upper_90);
    test.equal(600, timer_data.sum_90);
    test.equal(150, timer_data.mean_80);
    test.equal(200, timer_data.upper_80);
    test.equal(300, timer_data.sum_80);
    test.done();
  }
}
