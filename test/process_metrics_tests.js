var pm = require('../lib/process_metrics')

module.exports = {
  setUp: function (callback) {
    this.time_stamp = Math.round(new Date().getTime() / 1000);

    var counters = {};
    var gauges = {};
    var timers = {};
    var timer_counters = {};
    var sets = {};
    var pctThreshold = null;

    this.metrics = {
      counters: counters,
      gauges: gauges,
      timers: timers,
      timer_counters: timer_counters,
      sets: sets,
      pctThreshold: pctThreshold
    }
    callback();
  },
  counters_has_stats_count: function(test) {
    test.expect(1);
    this.metrics.counters['a'] = 2;
    pm.process_metrics(this.metrics, 1000, this.time_stamp, function(){});
    test.equal(2, this.metrics.counters['a']);
    test.done();
  },
  counters_has_correct_rate: function(test) {
    test.expect(1);
    this.metrics.counters['a'] = 2;
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    test.equal(20, this.metrics.counter_rates['a']);
    test.done();
  },
  timers_handle_empty: function(test) {
    test.expect(1);
    this.metrics.timers['a'] = [];
    this.metrics.timer_counters['a'] = 0;
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    //potentially a cleaner way to check this
    test.equal(undefined, this.metrics.counter_rates['a']);
    test.done();
  },
  timers_single_time: function(test) {
    test.expect(7);
    this.metrics.timers['a'] = [100];
    this.metrics.timer_counters['a'] = 1;
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    timer_data = this.metrics.timer_data['a'];
    test.equal(0, timer_data.std);
    test.equal(100, timer_data.upper);
    test.equal(100, timer_data.lower);
    test.equal(1, timer_data.count);
    test.equal(10, timer_data.count_ps);
    test.equal(100, timer_data.sum);
    test.equal(100, timer_data.mean);
    test.done();
  },
    timers_multiple_times: function(test) {
    test.expect(7);
    this.metrics.timers['a'] = [100, 200, 300];
    this.metrics.timer_counters['a'] = 3;
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    timer_data = this.metrics.timer_data['a'];
    test.equal(81.64965809277261, timer_data.std);
    test.equal(300, timer_data.upper);
    test.equal(100, timer_data.lower);
    test.equal(3, timer_data.count);
    test.equal(30, timer_data.count_ps);
    test.equal(600, timer_data.sum);
    test.equal(200, timer_data.mean);
    test.done();
  },
    timers_single_time_single_percentile: function(test) {
    test.expect(3);
    this.metrics.timers['a'] = [100];
    this.metrics.timer_counters['a'] = 1;
    this.metrics.pctThreshold = [90];
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    timer_data = this.metrics.timer_data['a'];
    test.equal(100, timer_data.mean_90);
    test.equal(100, timer_data.upper_90);
    test.equal(100, timer_data.sum_90);
    test.done();
  },
    timers_single_time_multiple_percentiles: function(test) {
    test.expect(6);
    this.metrics.timers['a'] = [100];
    this.metrics.timer_counters['a'] = 1;
    this.metrics.pctThreshold = [90, 80];
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    timer_data = this.metrics.timer_data['a'];
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
    this.metrics.timers['a'] = [100, 200, 300];
    this.metrics.timer_counters['a'] = 3;
    this.metrics.pctThreshold = [90];
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    timer_data = this.metrics.timer_data['a'];
    test.equal(200, timer_data.mean_90);
    test.equal(300, timer_data.upper_90);
    test.equal(600, timer_data.sum_90);
    test.done();
  },
    timers_multiple_times_multiple_percentiles: function(test) {
    test.expect(6);
    this.metrics.timers['a'] = [100, 200, 300];
    this.metrics.timer_counters['a'] = 3;
    this.metrics.pctThreshold = [90, 80];
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    timer_data = this.metrics.timer_data['a'];
    test.equal(200, timer_data.mean_90);
    test.equal(300, timer_data.upper_90);
    test.equal(600, timer_data.sum_90);
    test.equal(150, timer_data.mean_80);
    test.equal(200, timer_data.upper_80);
    test.equal(300, timer_data.sum_80);
    test.done();
  },
    timers_sampled_times: function(test) {
    test.expect(8);
    this.metrics.timers['a'] = [100, 200, 300];
    this.metrics.timer_counters['a'] = 50;
    this.metrics.pctThreshold = [90, 80];
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    timer_data = this.metrics.timer_data['a'];
    test.equal(50, timer_data.count);
    test.equal(500, timer_data.count_ps);
    test.equal(200, timer_data.mean_90);
    test.equal(300, timer_data.upper_90);
    test.equal(600, timer_data.sum_90);
    test.equal(150, timer_data.mean_80);
    test.equal(200, timer_data.upper_80);
    test.equal(300, timer_data.sum_80);
    test.done();
  },
    statsd_metrics_exist: function(test) {
    test.expect(1);
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    statsd_metrics = this.metrics.statsd_metrics;
    test.notEqual(undefined, statsd_metrics["processing_time"]);
    test.done();
  }
}
