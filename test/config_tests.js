var config = require('../lib/config');

module.exports = {
  setUp: function (callback) {
    callback();
  },
  tearDown: function (callback) {
    callback();
  },
  config_loaded_from_file_if_file_not_null: function(test) {
    test.expect(1);
    config.configFile('./exampleConfig.js', function(c) {
      test.equal(c.graphiteHost, 'graphite.example.com');
      test.done();
    });
  },
  config_loaded_from_env_if_file_is_null: function (test) {
    test.expect(2);

    process.env.STATSD_graphiteHost = 'envgraphite.example.com';
    process.env.STATSD_graphite_globalPrefix = 'foobar';

    config.configFile(null, function(c) {
      test.equal(c.graphiteHost, 'envgraphite.example.com');
      test.equal(c.graphite.globalPrefix, 'foobar');
      test.done();
    });
  }
};
