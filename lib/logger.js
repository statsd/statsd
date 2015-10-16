/*jshint node:true, laxcomma:true */

var Logger = function (config) {
  var self = this;

  this.config  = config;
  this.backend = this.config.backend || 'stdout';
  this.level   = this.config.level || "LOG_INFO";

  // initialization
  if (this.backend == 'stdout') {
    this.util = require('util');
  } else {
    if (this.backend == 'syslog') {
      this.util = require('node-syslog');
      this.util.init(config.application || 'statsd', this.util.LOG_PID | this.util.LOG_ODELAY, this.util.LOG_LOCAL0);
    } else {
      throw "Logger: Should be 'stdout' or 'syslog'.";
    }
  }

  this.log = function (msg, type) {
    if (self.backend == 'stdout') {
      if (!type) {
        type = 'DEBUG';
      }
      this.util.log(type + ": " + msg);
    } else {
      if (!type) {
        type = self.level;
        if (!this.util[type]) {
          throw "Undefined log level: " + type;
        }
      } else if (type == 'debug') {
        type = "LOG_DEBUG";
      }
      this.util.log(this.util[type], msg);
    }
  };

  this.setConfig = function(config) {
    self.config = config;
  };

};


exports.Logger = Logger;
