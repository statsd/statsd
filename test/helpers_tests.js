var helpers = require('../lib/helpers');

module.exports = {

  no_metrics_field: function (test) {
    var res = helpers.is_valid_packet(['foo', undefined]);
    test.equals(res, false);
    test.done();
  },

  wrong_formated_metric_value: function (test) {
    var res = helpers.is_valid_packet(['0,345345', 'ms']);
    test.equals(res, false);
    test.done();
  },

  wrong_formated_sampling_value: function (test) {
    var res = helpers.is_valid_packet(['345345', 'ms', '0,456456']);
    test.equals(res, false);
    test.done();
  },

  counter_deltas_positive_are_not_valid: function (test) {
    var res = helpers.is_valid_packet(['+10', 'c']);
    test.equals(res, false);
    test.done();
  },

  counter_deltas_negative_are_not_valid: function (test) {
    var res = helpers.is_valid_packet(['-10', 'c']);
    test.equals(res, false);
    test.done();
  },

  gauges_delta_positive_are_valid: function (test) {
    var res = helpers.is_valid_packet(['+10', 'g']);
    test.equals(res, true);
    test.done();
  },

  gauges_delta_negative_are_valid: function (test) {
    var res = helpers.is_valid_packet(['-10', 'g']);
    test.equals(res, true);
    test.done();
  },

  sets_strings_are_valid: function (test) {
    var res = helpers.is_valid_packet(['foo', 's']);
    test.equals(res, true);
    test.done();
  },

  sets_numeric_are_valid: function (test) {
    var res = helpers.is_valid_packet(['123456', 's']);
    test.equals(res, true);
    test.done();
  },

  correct_packet: function (test) {
    var res = helpers.is_valid_packet(['345345', 'ms', '@1.0']);
    test.equals(res, true);
    test.done();
  },

  correct_packet_with_small_sampling: function (test) {
    var res = helpers.is_valid_packet(['100', 'ms', '@0.1']);
    test.equals(res, true);
    test.done();
  }

};
