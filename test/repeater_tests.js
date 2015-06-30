var net           = require('net'),
    spawn         = require('child_process').spawn,
    fs            = require('fs'),
    temp          = require('temp'),
    dgram         = require('dgram'),
    EventEmitter  = require('events').EventEmitter;




function log() {
  //console.log.apply(console, arguments);
}


function StatsDWrapper(serverpath) {
  var wrapper = function(port, message_callback) {
    this.port = port || 9125;
    this.statsd = require(serverpath);
    this.message_callback = message_callback;
  };
  
  wrapper.prototype.start = function(cb) {
    var self = this;
    this.statsd.start({ port: this.port }, function(packet, rinfo) {
      self.message_callback(packet, rinfo);
    });
  
    this.statsd.server.on('listening', function() {
      cb();
    });
  };
  
  return wrapper;
};

var TcpStatsD = StatsDWrapper('../servers/tcp');
TcpStatsD.prototype.stop = function(cb) {
  if(this.statsd.server) {
    this.statsd.server.close(cb);
  }
};

var UdpStatsD = StatsDWrapper('../servers/udp');
UdpStatsD.prototype.stop = function(cb) {
  if(this.statsd.server) {
    this.statsd.server.close();
    cb();
  }
};



var RepeaterServer = function(port, server_port) {
  this.port = port || 8125;
  this.server_port = server_port || 9125;
  this.config = {
    repeater: [{ host: '127.0.0.1', port: this.server_port }],
    repeaterProtocol: 'udp4',
    server: './servers/udp',
    port: this.port,
    backends: [ './backends/repeater' ]
  };

  this.emitter = new EventEmitter();
};

RepeaterServer.prototype.start = function(cb) {
  this.repeater = require('../backends/repeater');
  this.repeater.init(0, this.config, this.emitter);
  cb();
};

RepeaterServer.prototype.send = function(stringval) {
  this.emitter.emit('packet', new Buffer(stringval), {});
};

RepeaterServer.prototype.stop = function(cb) {
  this.repeater.stop(cb);
};



var ServerSet = function() {
  this.servers = [];
};
ServerSet.prototype.add = function() { 
  for(var i = 0; i < arguments.length; i++) {
    this.servers.push(arguments[i]);
  }
};
ServerSet.prototype.start = function(cb) {
  var self = this;
  function start_server(i) {
    if(i == self.servers.length) {
      cb();
    } else {
      self.servers[i].start(function() {
        start_server(i + 1);
      });
    }
  }
  start_server(0);
};
ServerSet.prototype.stop = function(cb) {
  var self = this;
  function stop_server(i) {
    if(i == self.servers.length) {
      cb();
    } else {
      self.servers[i].stop(function() {
        stop_server(i + 1);
      });
    }
  }
  stop_server(0);
};



module.exports = {

  setUp: function(cb) {
    this.servers = new ServerSet();
    this.repeater = new RepeaterServer();
    this.servers.add(this.repeater);
    cb();
  },

  tearDown: function(cb) {
    this.servers.stop(cb);
  },


  repeater_works: function(test) {
    test.expect(1);
    var statsd = new UdpStatsD(9125, function(packet, rinfo) {
      test.equal('foobar', packet.toString());
      test.done();
    });

    this.servers.add(statsd);

    var repeater = this.repeater;

    this.servers.start(function() { 
      repeater.send('foobar');
    });
  },

  tcp_repeater_works: function(test) {
    test.expect(1);

    var statsd = new TcpStatsD(9125, function(packet, rinfo) {
      test.equal('foobar\n', packet.toString());
      test.done();
    });

    this.servers.add(statsd);
    
    var repeater = this.repeater;
    repeater.config.repeaterProtocol = 'tcp';
    
    this.servers.start(function() {
      repeater.send('foobar');
    });
  }

};


