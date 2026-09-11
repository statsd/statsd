/*jshint node:true, laxcomma:true */

// Syslog severities (lower is more severe). LOG_ERROR aliases LOG_ERR
// because Logger.log types are DEBUG/INFO/WARNING/ERROR.
const LOG_LEVELS = {
  LOG_EMERG: 0,
  LOG_ALERT: 1,
  LOG_CRIT: 2,
  LOG_ERR: 3,
  LOG_ERROR: 3,
  LOG_WARNING: 4,
  LOG_NOTICE: 5,
  LOG_INFO: 6,
  LOG_DEBUG: 7
};

const Logger = function (config) {
  this.config  = config;
  this.backend = this.config.backend || 'stdout';
  this.level   = this.config.level || "LOG_INFO";
  if (this.backend == 'syslog') {
    this.util = require('modern-syslog');
    this.util.init(config.application || 'statsd', this.util.LOG_PID | this.util.LOG_ODELAY, this.util.LOG_LOCAL0);
  } else if (this.backend != 'stdout') {
    throw "Logger: Should be 'stdout' or 'syslog'.";
  }
};

Logger.prototype = {
  log: function (msg, type) {
    if (this.backend == 'stdout') {
      if (LOG_LEVELS[this.level] === undefined) {
        throw "Undefined log level: " + this.level;
      }
      // Untyped messages keep the historical DEBUG label but use the
      // configured level for filtering, matching the syslog branch.
      let msgLevel;
      if (!type) {
        type = 'DEBUG';
        msgLevel = this.level;
      } else {
        msgLevel = "LOG_" + type.toUpperCase();
        if (LOG_LEVELS[msgLevel] === undefined) {
          throw "Undefined log level: " + msgLevel;
        }
      }
      if (LOG_LEVELS[msgLevel] <= LOG_LEVELS[this.level]) {
        console.log(new Date().toLocaleString() + " - " + type + ": " + msg);
      }
    } else {
      let level;
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
