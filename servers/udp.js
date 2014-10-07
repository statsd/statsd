var dgram  = require('dgram');
var control = require('strong-control-channel/process');
var server;
var channel;

try {
  channel = control.attach();
  console.log('Server udp attached');
} catch(er) {
  console.error('Not initializing IPC control channel: %s', er.stack);
}

exports.start = function(config, callback){
  var udp_version = config.address_ipv6 ? 'udp6' : 'udp4';
  var port = 'port' in config ? config.port : 8125;
  server = dgram.createSocket(udp_version, callback);
  server.bind(port, config.address || undefined);

  server.on('listening', function() {
    var addr = this.address();
    console.log('Server udp listening with %s on %s:%d',
      addr.family, addr.address, addr.port);

    addr.cmd = 'address';

    if (channel)
      channel.request(addr, function(rsp) {});
  });

  return true;
};
