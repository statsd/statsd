/*jshint node:true, laxcomma:true */

var Logger = function (config) {
  this.config  = config;
  this.backend = this.config.backend || 'stdout';
  this.level   = this.config.level || "LOG_INFO";
  this.base_util = require('util');
  if (this.backend == 'stdout') {
    this.util = this.base_util;
  } else {
    if (this.backend == 'console') {
        this.util = console;
    } else {
      throw "Logger: Should be 'stdout' or 'console'.";
    };
  };
    this.util.log("Logger enabled.");
};

Logger.prototype = {
  log: function (msg, type) {
    if (this.backend == 'stdout') {
      if (!type) {
        type = 'DEBUG';
      }
      this.util.log(type + ": " + msg);
    } else {
      if (!type) {
        type = this.level;
        if (!this.util[type]) {
          throw "Undefined log level: " + type;
        }
      } else if (type == 'debug') {
        type = "LOG_DEBUG";
      }
      this.util.log(this.util[type], msg);
    }
  }
};

exports.Logger = Logger;
