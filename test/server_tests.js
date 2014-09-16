var dgram = require('dgram'),
    net = require('net');

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
