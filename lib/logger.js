/*jshint node:true, laxcomma:true */

var Logger = function (config) {
  this.config  = config;
  this.backend = this.config.backend || 'stdout';
  this.level   = this.config.level || "LOG_INFO";
  if (this.backend == 'stdout') {
    this.util = require('util');
  } else {
    if (this.backend == 'syslog') {
      this.util = require('modern-syslog');
      this.util.init(config.application || 'statsd', this.util.LOG_PID | this.util.LOG_ODELAY, this.util.LOG_LOCAL0);
    } else {
      throw "Logger: Should be 'stdout' or 'syslog'.";
    }
  }
};

Logger.prototype = {
  log: function (msg, type) {
    if (this.backend == 'stdout') {
      if (!type) {
        type = 'DEBUG';
      }
      this.util.log(type + ": " + msg);
    } else {
      var level;
      if (!type) {
        level = this.level;
      } else {
        level = "LOG_" + type.toUpperCase();
      }

      if (!this.util[level]) {
        throw "Undefined log level: " + level;
      }

      this.util.log(this.util[level], msg);
    }
  }
};

exports.Logger = Logger;
