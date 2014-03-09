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

  counter_empty_are_invalid: function (test) {
    var res = helpers.is_valid_packet(['', 'c']);
    test.equals(res, false);
    test.done();
  },

  counter_deltas_scientific_are_valid: function (test) {
    var res = helpers.is_valid_packet(['+10e1', 'c']);
    test.equals(res, true);
    test.done();
  },

  counter_deltas_positive_are_valid: function (test) {
    test.equals(helpers.is_valid_packet(['+10', 'c']), true);
    test.equals(helpers.is_valid_packet(['+10e1', 'c']), true);
    test.done();
  },

  counter_deltas_negative_are_valid: function (test) {
    var res = helpers.is_valid_packet(['-10', 'c']);
    test.equals(res, true);
    test.done();
  },

  counter_deltas_positive_are_valid: function (test) {
    test.equals(helpers.is_valid_packet(['+10', 'c']), true);
    test.equals(helpers.is_valid_packet(['+10e1', 'c']), true);
    test.done();
  },

  times_negative_are_invalid: function (test) {
    test.equals(helpers.is_valid_packet(['-1', 'ms']), false);
    test.equals(helpers.is_valid_packet(['-1.0', 'ms']), false);
    test.equals(helpers.is_valid_packet(['-1', 'ms']), false);
    test.done();
  },

  times_positive_are_valid: function (test) {
    test.equals(helpers.is_valid_packet(['+1', 'ms']), true);
    test.equals(helpers.is_valid_packet(['1.0', 'ms']), true);
    test.equals(helpers.is_valid_packet(['+1.0', 'ms']), true);
    test.done();
  },

  times_zero_are_valid: function (test) {
    test.equals(helpers.is_valid_packet(['+0.0', 'ms']), true);
    test.equals(helpers.is_valid_packet(['-0.0', 'ms']), true);
    test.equals(helpers.is_valid_packet(['0.0', 'ms']), true);
    test.equals(helpers.is_valid_packet(['0', 'ms']), true);
    test.done();
  },

  gauges_empty_are_invalid: function (test) {
    test.equals(helpers.is_valid_packet(['', 'g']), false);
    test.done();
  },

  gauges_delta_positive_are_valid: function (test) {
    test.equals(helpers.is_valid_packet(['10', 'g']), true);
    test.equals(helpers.is_valid_packet(['+10', 'g']), true);
    test.equals(helpers.is_valid_packet(['10.0', 'g']), true);
    test.equals(helpers.is_valid_packet(['+10.0', 'g']), true);
    test.done();
  },

  gauges_delta_negative_are_valid: function (test) {
    test.equals(helpers.is_valid_packet(['-10', 'g']), true);
    test.equals(helpers.is_valid_packet(['-10.0', 'g']), true);
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

  sampling_is_invalid: function (test) {
    test.equals(helpers.is_valid_packet(['345345', 'ms', '']), false);
    test.equals(helpers.is_valid_packet(['345345', 'ms', 'b']), false);
    test.equals(helpers.is_valid_packet(['345345', 'ms', 'blah']), false);
    test.equals(helpers.is_valid_packet(['345345', 'ms', '@']), false);
    test.equals(helpers.is_valid_packet(['345345', 'ms', '@blah']), false);
    test.equals(helpers.is_valid_packet(['345345', 'ms', '@.']), false);
    test.equals(helpers.is_valid_packet(['345345', 'ms', '@.1.']), false);
    test.equals(helpers.is_valid_packet(['345345', 'ms', '@.1.2.3']), false);
    test.done();
  },

  sampling_is_valid: function (test) {
    test.equals(helpers.is_valid_packet(['345345', 'ms', '@2']), true);
    test.equals(helpers.is_valid_packet(['345345', 'ms', '@.2']), true);
    test.equals(helpers.is_valid_packet(['345345', 'ms', '@0.2']), true);
    test.equals(helpers.is_valid_packet(['345345', 'ms', '@2e-1']), true);
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
