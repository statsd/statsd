/*
 * bindings.js: Example for running daemons directly using methods exposed by add-on bindings.
 *
 * (C) 2010, Charlie Robbins.
 *
 */

var sys = require('sys'),
    fs = require('fs'),
    http = require('http');

var daemon;
try {
  daemon = require('../lib/daemon');
}
catch (ex) {
  sys.puts("Couldn't find 'daemon' add-on, did you install it yet?");
  process.exit(0);
}

var config = {
  lockFile: '/tmp/testd.pid',  // Location of lockFile
  logFile: '/tmp/testd.log'    // Location of logFile
};

var args = process.argv;

// Handle start stop commands
switch(args[2]) {
  case "stop":
    process.kill(parseInt(fs.readFileSync(config.lockFile)));
    process.exit(0);
    break;
    
  case "start":
    fs.open(config.logFile, 'w+', function (err, fd) {
      if (err) return sys.puts('Error starting daemon: ' + err);
      
      daemon.start(fd);
      daemon.lock(config.lockFile);
    });
    break;
    
  default:
    sys.puts('Usage: [start|stop]');
    process.exit(0);
}

// Start HTTP Server
http.createServer(function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<h1>Hello, World!</h1>');
  res.end();
}).listen(8000);
