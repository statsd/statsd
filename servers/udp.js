var dgram  = require('dgram'),
    Logger = require('../lib/logger').Logger;

exports.start = function(config, callback) {
  var l = new Logger(config.log || {});
  var udp_version = config.address_ipv6 ? 'udp6' : 'udp4';
  var server = dgram.createSocket(udp_version, callback);

  server.bind(config.port || 8125, config.address || undefined);
  this.server = server;

  return true;
};
