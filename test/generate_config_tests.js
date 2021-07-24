require('dotenv').config({ path: '.env.test' });

const generateConfig = require('../utils/generateConfig');

module.exports = {
  assigns_values: function(test) {
    const config = generateConfig.exec();

    test.equal(config.graphiteHost, "test.graphite.host"); // strings
    test.equal(config.dumpMessages, false); // booleans

    // arrays
    const { graphiteBackends } = config;
    test.equal(graphiteBackends.length, 2);
    test.equal(graphiteBackends[0], "./backends/console");
    test.equal(graphiteBackends[1], "./backends/graphite");

    //objects
    const { log } = config;
    test.equal(log.backend, "stdout");
    test.equal(log.application, "statsd");
    test.equal(log.level, "LOG_INFO");

    const { servers } = config;
    test.equal(servers[0].server, "./servers/udp");
    test.equal(servers[0].address, "localhost");
    test.equal(servers[0].address_ipv6, false);
    test.equal(servers[0].port, "8125/udp");

    test.done();
  }
}