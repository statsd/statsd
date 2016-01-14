/*jshint node:true, laxcomma:true */

var net = require('net');

exports.start = function(config, on_data_callback, on_error_callback) {
  var server = net.createServer(function(stream) {
      stream.setEncoding('ascii');

      stream.on('data', function(data) {
        var cmdline = data.trim().split(" ");
        var cmd = cmdline.shift();

        on_data_callback(cmd, cmdline, stream);
      });

      stream.on('error', function(err) {
        on_error_callback(err, stream);
      });
  });

  server.listen(config.mgmt_port || 8126, config.mgmt_address || undefined);

  return true;
};
