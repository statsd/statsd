var dgram = require('dgram'),
    net = require('net'),
    control = require('strong-control-channel/process'),
    fork = require('child_process').fork;

var config = {
    address: '127.0.0.1',
    port: 8125
};
var msg = "This is a test\r\n";

module.exports = {
  udp_data_received: function(test) {
    test.expect(3);
    var server = require('../servers/udp');
    var started = server.start(config, function(data, rinfo) {
        test.equal(msg, data.toString());
        test.equal(msg.length, rinfo.size);
        test.done();
    });
    test.ok(started);

    var buf = new Buffer(msg);
    var sock = dgram.createSocket('udp4');
    sock.send(buf, 0, buf.length, config.port, config.address, function(err, bytes) {
          sock.close();
    });
  },
  udp_child_control: function(test) {
    var statsd = require.resolve('../stats.js');
    var config = require.resolve('./udp_child_control.config');
    var server = fork(statsd, [config], {silent: true});
    var client = control.attach(function(){}, server);
    // Wait for server to be up
    setTimeout(function() {
      // Check it returns a non-zero ephemeral port
      client.request({cmd: 'address'}, function(rsp) {
        test.ok(rsp.address.port);
        finish();
      });
    }, 100);
    function finish() {
      // Check it exits on channel close
      server.disconnect();
      server.once('exit', function() {
        test.done();
      });
    }
  },
  tcp_data_received: function(test) {
    test.expect(3);
    var server = require('../servers/tcp');
    var started = server.start(config, function(data, rinfo) {
        test.equal(msg, data.toString());
        test.equal(msg.length, rinfo.size);
        test.done();
    });
    test.ok(started);

    var client = net.connect(config.port, config.address, function() {
        client.write(msg);
        client.end();
    });
  }
}
