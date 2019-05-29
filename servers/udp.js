const dgram  = require('dgram');

exports.start = function(config, callback) {
  const udp_version = config.address_ipv6 ? 'udp6' : 'udp4';
  const server = dgram.createSocket(udp_version, callback);

  server.bind(config.port || 8125, config.address || undefined);
  this.server = server;

  return true;
};
