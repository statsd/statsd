var pm = require('../lib/process_metrics')

module.exports = {
  setUp: function (callback) {
    this.time_stamp = Math.round(new Date().getTime() / 1000);

    var counters = {};
    var gauges = {};
    var timers = {};
    var sets = {};
    var pctThreshold = null;

    this.metrics = {
      counters: counters,
      gauges: gauges,
      timers: timers,
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
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    //potentially a cleaner way to check this
    test.equal(undefined, this.metrics.counter_rates['a']);
    test.done();
  },
  timers_single_time: function(test) {
    test.expect(6);
    this.metrics.timers['a'] = [100];
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    timer_data = this.metrics.timer_data['a'];
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
    this.metrics.timers['a'] = [100, 200, 300];
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    timer_data = this.metrics.timer_data['a'];
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
    this.metrics.timers['a'] = [100];
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
  }, // check if the correct settings are being applied. as well as actual counts
    timers_histogram: function (test) {
    test.expect(45);
    this.metrics.timers['a'] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.metrics.timers['abc'] = [0.1234, 2.89, 4, 6, 8];
    this.metrics.timers['foo'] = [0, 2, 4, 6, 8];
    this.metrics.timers['barbazfoobar'] = [0, 2, 4, 6, 8];
    this.metrics.timers['bar.bazfoobar.abc'] = [0, 2, 4, 6, 8];
    this.metrics.timers['xyz'] = [0, 2, 4, 6, 8];
    this.metrics.histogram = [ { metric: 'foo', bins: [] },
                               { metric: 'abcd', bins: [ 1, 5, 'inf'] },
                               { metric: 'abc', bins: [ 1, 2.21, 'inf'] },
                               { metric: 'a', bins: [ 1, 2] } ];
    pm.process_metrics(this.metrics, 100, this.time_stamp, function(){});
    timer_data = this.metrics.timer_data;
    // nothing matches the 'abcd' config, so nothing has bin_5
    test.equal(undefined, timer_data['a']['bin_5']);
    test.equal(undefined, timer_data['abc']['bin_5']);
    test.equal(undefined, timer_data['foo']['bin_5']);
    test.equal(undefined, timer_data['barbazfoobar']['bin_5']);
    test.equal(undefined, timer_data['bar.bazfoobar.abc']['bin_5']);
    test.equal(undefined, timer_data['xyz']['bin_5']);

    // check that 'a' got the right config and numbers
    test.equal(0, timer_data['a']['bin_1']);
    test.equal(1, timer_data['a']['bin_2']);
    test.equal(undefined, timer_data['a']['bin_inf']);

    // only 'abc' should have a bin_inf; also check all its counts,
    // and make sure it has no other bins
    // amount of non-bin_ keys: std, upper, lower, count, sum, mean -> 6
    test.equal(1, timer_data['abc']['bin_1']);
    test.equal(0, timer_data['abc']['bin_2_21']);
    test.equal(4, timer_data['abc']['bin_inf']);
    for (key in timer_data['abc']) {
        test.ok(key.indexOf('bin_') < 0 || key == 'bin_1' || key == 'bin_2_21' || key == 'bin_inf');
    }

    // 'foo', 'barbazfoobar' and 'bar.bazfoobar.meh' and 'xyz' should not have any bin
    for (key in timer_data['foo']) {
        test.ok(key.indexOf('bin_') < 0);
    }
    for (key in timer_data['barbazfoobar']) {
        test.ok(key.indexOf('bin_') < 0);
    }
    for (key in timer_data['bar.bazfoobar.abc']) {
        test.ok(key.indexOf('bin_') < 0);
    }
    for (key in timer_data['xyz']) {
        test.ok(key.indexOf('bin_') < 0);
    }

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
