var util = require('util'),
    dgram = require('dgram');

function RepeaterBackend(startupTime, config, emitter){
  var self = this;
  this.config = config.repeater || [];
  this.sock = (config.repeaterProtocol == 'udp6') ?
        dgram.createSocket('udp6') :
        dgram.createSocket('udp4');
  // Attach DNS error handler
  this.sock.on('error', function (err) {
    console.log('Repeater error: ' + err);
  });
  // attach
  emitter.on('packet', function(packet, rinfo) { self.process(packet, rinfo); });
};

RepeaterBackend.prototype.process = function(packet, rinfo) {
  var self = this;
  hosts = self.config;
  for(var i=0; i<hosts.length; i++) {
    self.sock.send(packet,0,packet.length,hosts[i].port,hosts[i].host,
                   function(err,bytes) {
      if (err) {
        console.log(err);
      }
    });
  }
};

exports.init = function(startupTime, config, events) {
  var instance = new RepeaterBackend(startupTime, config, events);
  return true;
};
