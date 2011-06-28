/*
 * wrapper.js: Example for running daemons using friendly wrapper methods exposed in Javascript.
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
    daemon.kill(config.lockFile, function (err, pid) {
      if (err) return sys.puts('Error stopping daemon: ' + err);
      sys.puts('Successfully stopped daemon with pid: ' + pid);
    });
    break;
    
  case "start":
    // Start HTTP Server
    http.createServer(function(req, res) {
    //  sys.puts('Incoming request for: ' + req.url);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write('<h1>Hello, World!</h1>');
      res.end();
    }).listen(8000);
    
    daemon.daemonize(config.logFile, config.lockFile, function (err, started) {
      if (err) {
        console.dir(err.stack);
        return sys.puts('Error starting daemon: ' + err);      
      }
      sys.puts('Successfully started daemon');
    });
    break;
    
  default:
    sys.puts('Usage: [start|stop]');
    break;
}

