var nano  = require('nanomsg');

exports.start = function(config, callback) {
  var address = config.address || "tcp://127.0.0.1";
  var port    = config.port    || "8125";
  var sock_options  = config.options || {};
  var pull = nano.socket('pull', sock_options);
  pull.bind(address + ":" + port);
  pull.on('data', function (buf) {
    callback(buf);
  });
  return true;
};
