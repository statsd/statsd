var Logger = function (config) {
  this.config  = config;
  this.backend = this.config.backend || 'stdout'
  if (this.backend == 'stdout') {
    this.util = require('util');
  } else {
    if (this.backend == 'syslog') {
      this.util = require('node-syslog');
      this.util.init(config.application || 'statsd', this.util.LOG_PID | this.util.LOG_ODELAY, this.util.LOG_LOCAL0);
    } else {
      throw "Logger: Should be 'stdout' or 'syslog'."
    }
  }
}

Logger.prototype = {
  log: function (msg, type) {
    if (this.backend == 'stdout') {
      if (!type) {
        type = 'DEBUG: ';
      }
      this.util.log(DEBUG + msg);
    } else {
      if (!type) {
        type = this.util.LOG_INFO;
      } else if (type == 'debug') {
        type = this.util.LOG_DEBUG;
      }
      this.util.log(this.util.LOG_INFO, msg);
    }
  }
}

exports.Logger = Logger
