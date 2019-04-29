/*jshint node:true, laxcomma:true */

const net = require('net');

exports.start = function(config, on_data_callback, on_error_callback) {
  const server = net.createServer(function(stream) {
      stream.setEncoding('ascii');

      stream.on('data', function(data) {
        const cmdline = data.trim().split(" ");
        const cmd = cmdline.shift();

        on_data_callback(cmd, cmdline, stream);
      });

      stream.on('error', function(err) {
        on_error_callback(err, stream);
      });
  });

  server.listen(config.mgmt_port || 8126, config.mgmt_address || undefined);

  return true;
};
