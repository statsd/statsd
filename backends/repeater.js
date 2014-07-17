/*jshint node:true, laxcomma:true */
'use strict';

var util = require('util')
  , dgram = require('dgram');

var BackendBase = require('./base');

var l;
var debug;

function RepeaterBackend(startupTime, config, emitter) {
	BackendBase.call(this, startupTime, config.repeater || [], emitter);

  this.sock = (config.repeaterProtocol == 'udp6') ?
        dgram.createSocket('udp6') :
        dgram.createSocket('udp4');
  // Attach DNS error handler
  this.sock.on('error', function (err) {
    if (debug) {
      l.log('Repeater error: ' + err);
    }
  });
}
util.inherits(RepeaterBackend, BackendBase);

RepeaterBackend.prototype.onPacketEvent = function(packet) {
  var self = this;
  var hosts = self.config;
  for(var i=0; i<hosts.length; i++) {
    self.sock.send(packet,0,packet.length,hosts[i].port,hosts[i].host,
                   function(err) {
      if (err && debug) {
        l.log(err);
      }
    });
  }
};

exports.init = function(startupTime, config, events, logger) {
  new RepeaterBackend(startupTime, config, events);
  debug = config.debug;
  l = logger;
  return true;
};
