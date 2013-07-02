var process_mgmt = require('../lib/process_mgmt');

var config = {}
module.exports = {

  setUp: function(callback) {
      config = {};
      callback();
  },

  test_valid_title: function(test){
      test.expect(1);
      process_title = process.title;
      config.title = process_title.substring(1);
      process_mgmt.set_title(config);
      test.ok(process.title == config.title, "Can set a title that is less than or equal to the process title length");
      test.done();
  },

  test_invalid_title: function(test){
      process_title = process.title;
      test_title    = process.title + "1";
      config.title  = test_title;
      process_mgmt.set_title(config);
      test.ok(process.title == process_title, "Can't set a title that is longer than the process.title length");
      test.done();
  },

  test_no_title: function(test){
      process_title = process.title;
      config.title = false;
      process_mgmt.set_title(config);
      test.ok(process_title == process.title, "A config.title of false should not override the default node process.title");
      test.done();
  },

  test_default_title: function(test){
      default_title = 'statsd';
      process_mgmt.set_title(config);
      test.ok(process.title == default_title, "If no config.title option set, set the process.title to statsd");
      test.done();
  }

};
