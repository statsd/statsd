var dgram  = require('dgram');

exports.start = function(config, callback){
  var udp_version = config.address_ipv6 ? 'udp6' : 'udp4';
  var server = dgram.createSocket(udp_version, callback);
  server.bind(config.port || 8125, config.address || undefined);
  return true;
};
