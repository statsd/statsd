var process_mgmt = require('../lib/process_mgmt')
  , os = require('os');

var config = {}
  , can_set_title = true;

module.exports = {

  setUp: function(callback) {
      config = {};
      version_number = process.version.split(".")[1];
      platform = os.platform();
      can_set_title = (version_number >= 10 || platform != 'darwin');
      callback();
  },

  test_setting_title: function(test){
      if (can_set_title) {
        test.expect(1);
        process_title = process.title;
        config.title = "test-statsd";
        process_mgmt.set_title(config);
        test.ok(process.title == config.title, "Can set a title that is less than or equal to the process title length");
      } else {
        console.log("Not running this test, due to this being a node version before v0.10 and a Darwin os");
      }
      test.done();
  },

  test_no_title: function(test){
      test.expect(1);
      process_title = process.title;
      config.title = false;
      process_mgmt.set_title(config);
      test.ok(process_title == process.title, "A config.title of false should not override the default node process.title");
      test.done();
  },

  test_default_title: function(test){
      if (can_set_title) {
        test.expect(1);
        default_title = 'statsd';
        process_mgmt.set_title(config);
        test.ok(process.title == default_title, "If no config.title option set, set the process.title to statsd");
      } else {
        console.log("Not running this test, due to this being a node version before v0.10 and a Darwin os");
      }
      test.done();
  }

};
