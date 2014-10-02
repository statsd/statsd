var dgram  = require('dgram');
var control = require('strong-control-channel/process');
var server;

try {
  control.attach(onRequest);
  console.log('attach', !!process.send)
} catch(er) {
  console.error('Not initializing IPC control channel');
}

function onRequest(req, callback) {
  console.log('req', req);
  switch (req.cmd) {
    case 'address': {
      if (!server)
        return callback({error: 'notready'});
      return callback({
        address: server.address(),
      });
    }
    default:
      return callback({error: 'unsupported'});
  }
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
  });

  return true;
};
