var temp = require('temp'),
    _  = require('underscore'),
    fs = require('fs');

module.exports = {

	writeconfig: function(text,worker,cb,obj){
	  temp.open({suffix: '-statsdconf.js'}, function(err, info) {
	    if (err) throw err;
	    fs.writeSync(info.fd, text);
	    fs.close(info.fd, function(err) {
	      if (err) throw err;
	      worker(info.path,cb,obj);
	    });
	  });
	},

	array_contents_are_equal: function(first,second){
	  var intlen = _.intersection(first,second).length;
	  var unlen = _.union(first,second).length;
	  return (intlen == unlen) && (intlen == first.length);
	},

	statsd_send: function(data,sock,host,port,cb){
	  send_data = new Buffer(data);
	  sock.send(send_data,0,send_data.length,port,host,function(err,bytes){
	    if (err) {
	      throw err;
	    }
	    cb();
	  });
	},

	// keep collecting data until a specified timeout period has elapsed
	// this will let us capture all data chunks so we don't miss one
	collect_for: function(socket, timeout, callback) {
	  var body = '', self = this;
	  socket.pause();
	  socket.on('data', function(chunk) {
	    body += chunk;
	  });
	  setTimeout(function() {
	    var lines = [];
	    lines = lines.concat(body.split("\n"));
	    socket.removeAllListeners('data');
	    callback(lines);
	  }, timeout);
	  socket.resume();
	}
};
