/*
 * daemon.js: Wrapper for C++ bindings
 *
 * (C) 2010 and Charlie Robbins
 * MIT LICENCE
 *
 */

var fs = require('fs'),
    binding = require('../build/default/daemon'),
    daemon = exports;

//
// Export the raw bindings directly
//
Object.keys(binding).forEach(function (k) { daemon[k] = binding[k] });

// 
// function daemonize ([out, lock, callback])
//   Run is designed to encapsulate the basic daemon operation in a single async call.
//   When the callback returns you are in the the child process.
//
daemon.daemonize = function (out, lock, callback) {
  //
  // If we only get one argument assume it's an fd and 
  // simply return with the pid from binding.daemonize(fd);
  //
  if (arguments.length === 1) {
    return binding.daemonize(out);
  }
  
  fs.open(out, 'w+', 0666, function (err, fd) {
    if (err) return callback(err);
    
    try {
      var pid = daemon.start(fd);
      daemon.lock(lock);
      callback(null, pid);
    }
    catch (ex) {
      callback(ex);
    }
  });
};
  
// 
// function kill (lock, callback)
//   Asynchronously stop the process in the lock file and 
//   remove the lock file
//
daemon.kill = function (lock, callback) {
  fs.readFile(lock, function (err, data) {
    if (err) return callback(err);
    
    try {
      // Stop the process with the pid in the lock file
      var pid = parseInt(data.toString());
      process.kill(pid);
      
      // Remove the lock file
      fs.unlink(lock, function (err) {
        if (err) return callback(err);
        callback(null, pid);
      });
    }
    catch (ex) {
      callback(ex);
    }
  });
};