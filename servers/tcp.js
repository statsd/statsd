var net  = require('net');

exports.init = function(config, callback){
  var server = net.createServer(function(stream) {
      stream.setEncoding('ascii');

      stream.on('data', function(data) {
          var rinfo = stream.address();
          rinfo.size = data.length;
          callback(data, rinfo);
      });
  });

  server.listen(config.port || 8125, config.address || undefined);
  return true;
};
