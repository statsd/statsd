/** This backend pushes the metrics to browser.
 *  Uses socket.io and the stats are pushed to browser every 10s.
 */

var util = require('util')
var app = require('express')();
var server = require('http').createServer(app);
var socketIO = require('socket.io').listen(server);

server.listen(8000);

app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

function HttpBackend(startUpTime, config, emitter){
  console.log("configuring httpbackend");
  var self = this;
  this.lastFlush =  startUpTime;
  this.lastException = startUpTime;
  this.config = config.http || {};
}

push_stats = function(timestamp, metrics){
  socketIO.sockets.emit("counters", metrics);
}

HttpBackend.prototype.status = function(write) {
  ['lastFlush', 'lastException'].forEach(function(key) {
    write(null, 'console', key, this[key]);
  }, this);
};

exports.init = function(startupTime, config, events) {
  var instance = new HttpBackend(startupTime, config, events);
  events.on("flush", push_stats);
  return true;
};
