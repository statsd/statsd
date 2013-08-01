var ce = require('../lib/composition_engine');

module.exports = {
  setUp: function (callback) {

    var counters = {};

    this.metrics = {
      counters: counters
    }

    this.compositions = [{
      name: "#0.res_time.#1",
      regexp:[
        /^([a-z]+)\.time\.([a-z]+)/,
        /^([a-z]+)\.count\.([a-z]+)/
      ],
      compose: function(time, count) {
        return time / count;
      }
    }];

    callback();
  },
  calculate_response_time: function(test) {
    test.expect(1);
    this.metrics.counters['site.time.page'] = 100;
    this.metrics.counters['site.count.page'] = 2;
    ce(this.compositions, this.metrics, function(metrics){
      test.equal(50, metrics.counters['site.res_time.page']);
    });
    test.done();
  },
  should_not_store_NaN: function(test) {
    test.expect(1);
    this.metrics.counters['site.time.page'] = 100;
    this.metrics.counters['site.count.page'] = undefined;
    ce(this.compositions, this.metrics, function(metrics){
      test.ok(!metrics.counters.hasOwnProperty['site.res_time.page']);
    });
    test.done();
  }
};