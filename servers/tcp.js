var net  = require('net');

function rinfo(tcpstream, data) {
    this.address = tcpstream.remoteAddress;
    this.port = tcpstream.remotePort;
    this.family = tcpstream.address().family;
    this.size = data.length;
}

exports.start = function(config, callback){
  var server = net.createServer(function(stream) {
      stream.setEncoding('ascii');

      stream.on('data', function(data) {
          callback(data, new rinfo(stream, data));
      });
  });

  server.listen(config.port || 8125, config.address || undefined);
  return true;
};
