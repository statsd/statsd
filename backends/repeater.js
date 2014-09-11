/*jshint node:true, laxcomma:true */
'use strict';

var util = require('util')
  , dgram = require('dgram');

var BackendBase = require('./base');


function RepeaterBackend(startupTime, config, emitter, logger) {
	BackendBase.call(this, startupTime, config, emitter, logger);

  this.sock = (config.repeaterProtocol == 'udp6') ?
        dgram.createSocket('udp6') :
        dgram.createSocket('udp4');
  // Attach DNS error handler
  this.sock.on('error', function (err) {
    if (config.debug) {
      logger.log('Repeater error: ' + err);
    }
  });
}
util.inherits(RepeaterBackend, BackendBase);

RepeaterBackend.prototype.onPacketEvent = function(packet) {
  var self = this;
  var hosts = self.config.repeater;
  for(var i=0; i<hosts.length; i++) {
    self.sock.send(packet, 0, packet.length, hosts[i].port, hosts[i].host, function(err) {
      if (err && self.config.debug) {
        self.logger.log(err);
      }
    });
  }
};

exports.init = function(startupTime, config, events, logger) {
  new RepeaterBackend(startupTime, config, events, logger);
  return true;
};
