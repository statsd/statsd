/*jshint node:true, laxcomma:true */
'use strict';

/*
 * Flush stats to graphite (http://graphite.wikidot.com/).
 *
 * To enable this backend, include 'graphite' in the backends
 * configuration array:
 *
 *   backends: ['graphite']
 *
 * This backend supports the following config options:
 *
 *   graphiteHost: Hostname of graphite server.
 *   graphitePort: Port to contact graphite server at.
 */

var net = require('net');
var BackendBase = require('./base');

function GraphiteBackend(startupTime, config, emitter, logger) {
	BackendBase.call(this, startupTime, config, emitter, logger);

  this.debug = config.debug;
  config.graphite = config.graphite || {};
  var globalPrefix    = config.graphite.globalPrefix;
  var prefixCounter   = config.graphite.prefixCounter;
  var prefixTimer     = config.graphite.prefixTimer;
  var prefixGauge     = config.graphite.prefixGauge;
  var prefixSet       = config.graphite.prefixSet;
  var globalSuffix    = config.graphite.globalSuffix;
  var legacyNamespace = config.graphite.legacyNamespace;

  // set defaults for prefixes & suffix
  globalPrefix  = globalPrefix !== undefined ? globalPrefix : 'stats';
  prefixCounter = prefixCounter !== undefined ? prefixCounter : 'counters';
  prefixTimer   = prefixTimer !== undefined ? prefixTimer : 'timers';
  prefixGauge   = prefixGauge !== undefined ? prefixGauge : 'gauges';
  prefixSet     = prefixSet !== undefined ? prefixSet : 'sets';

  this.config.legacyNamespace = legacyNamespace !== undefined ? legacyNamespace : true;

  // In order to unconditionally add this string, it either needs to be
  // a single space if it was unset, OR surrounded by a . and a space if
  // it was set.
  this.config.globalSuffix  = globalSuffix !== undefined ? '.' + globalSuffix + ' ' : ' ';

	this.globalNamespace = [];
	this.counterNamespace = [];
	this.timerNamespace = [];
	this.gaugesNamespace = [];
	this.setsNamespace = [];
  if (this.config.legacyNamespace === false) {
    if (globalPrefix !== '') {
      this.globalNamespace.push(globalPrefix);
      this.counterNamespace.push(globalPrefix);
      this.timerNamespace.push(globalPrefix);
      this.gaugesNamespace.push(globalPrefix);
      this.setsNamespace.push(globalPrefix);
    }

    if (prefixCounter !== '') {
      this.counterNamespace.push(prefixCounter);
    }
    if (prefixTimer !== '') {
      this.timerNamespace.push(prefixTimer);
    }
    if (prefixGauge !== '') {
      this.gaugesNamespace.push(prefixGauge);
    }
    if (prefixSet !== '') {
      this.setsNamespace.push(prefixSet);
    }
  } else {
      this.globalNamespace = ['stats'];
      this.counterNamespace = ['stats'];
      this.timerNamespace = ['stats', 'timers'];
      this.gaugesNamespace = ['stats', 'gauges'];
      this.setsNamespace = ['stats', 'sets'];
  }

  this.graphiteStats = {
  	last_flush: startupTime,
  	last_exception: startupTime,
  	flush_time: 0,
  	flush_length: 0,
  };

  this.flush_counts = typeof(config.flush_counts) === 'undefined' ? true : config.flush_counts;
}
require('util').inherits(GraphiteBackend, BackendBase);

BackendBase.prototype.postToGraphite = function graphite_post_stats(statString) {
  var last_flush = this.graphiteStats.last_flush || 0;
  var last_exception = this.graphiteStats.last_exception || 0;
  var flush_time = this.graphiteStats.flush_time || 0;
  var flush_length = this.graphiteStats.flush_length || 0;
  if (this.config.graphiteHost) {
    try {
      var graphite = net.createConnection(this.config.graphitePort, this.config.graphiteHost);
      graphite.addListener('error', function(connectionException){
        if (this.debug) {
          this.logger.log(connectionException);
        }
      });
      var self = this;
      graphite.on('connect', function() {
        var ts = Math.round(new Date().getTime() / 1000);
        var ts_suffix = ' ' + ts + '\n';
        var namespace = self.globalNamespace.concat(prefixStats).join('.');
        statString += namespace + '.graphiteStats.last_exception' + self.config.globalSuffix + last_exception + ts_suffix;
        statString += namespace + '.graphiteStats.last_flush'     + self.config.globalSuffix + last_flush     + ts_suffix;
        statString += namespace + '.graphiteStats.flush_time'     + self.config.globalSuffix + flush_time     + ts_suffix;
        statString += namespace + '.graphiteStats.flush_length'   + self.config.globalSuffix + flush_length   + ts_suffix;

        var starttime = Date.now();
        this.write(statString);
        this.end();
        self.graphiteStats.flush_time = (Date.now() - starttime);
        self.graphiteStats.flush_length = statString.length;
        self.graphiteStats.last_flush = Math.round(new Date().getTime() / 1000);
      });
    } catch(e){
      if (this.debug) {
        this.logger.log(e);
      }
      this.graphiteStats.last_exception = Math.round(new Date().getTime() / 1000);
    }
  }
};

GraphiteBackend.prototype.onFlushEvent = function graphite_flush(ts, metrics) {
  var ts_suffix = ' ' + ts + '\n';
  var starttime = Date.now();
  var statString = '';
  var numStats = 0;
  var key;
  var timer_data_key;
  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var sets = metrics.sets;
  var counter_rates = metrics.counter_rates;
  var timer_data = metrics.timer_data;
  var statsd_metrics = metrics.statsd_metrics;

  for (key in counters) {
    var namespace = this.counterNamespace.concat(key);
    var value = counters[key];
    var valuePerSecond = counter_rates[key]; // pre-calculated "per second" rate

    if (this.config.legacyNamespace === true) {
      statString += namespace.join('.') + this.config.globalSuffix + valuePerSecond + ts_suffix;
      if (this.flush_counts) {
        statString += 'stats_counts.' + key + this.config.globalSuffix + value + ts_suffix;
      }
    } else {
      statString += namespace.concat('rate').join('.') + this.config.globalSuffix + valuePerSecond + ts_suffix;
      if (this.flush_counts) {
        statString += namespace.concat('count').join('.') + this.config.globalSuffix + value + ts_suffix;
      }
    }

    numStats += 1;
  }

  for (key in timer_data) {
    var namespace = this.timerNamespace.concat(key);
    var the_key = namespace.join('.');
    for (timer_data_key in timer_data[key]) {
      if (typeof(timer_data[key][timer_data_key]) === 'number') {
        statString += the_key + '.' + timer_data_key + this.config.globalSuffix + timer_data[key][timer_data_key] + ts_suffix;
      } else {
        for (var timer_data_sub_key in timer_data[key][timer_data_key]) {
          if (this.debug) {
            this.logger.log(timer_data[key][timer_data_key][timer_data_sub_key].toString());
          }
          statString += the_key + '.' + timer_data_key + '.' + timer_data_sub_key + this.config.globalSuffix +
                        timer_data[key][timer_data_key][timer_data_sub_key] + ts_suffix;
        }
      }
    }
    numStats += 1;
  }

  for (key in gauges) {
    var namespace = this.gaugesNamespace.concat(key);
    statString += namespace.join('.') + this.config.globalSuffix + gauges[key] + ts_suffix;
    numStats += 1;
  }

  for (key in sets) {
    var namespace = this.setsNamespace.concat(key);
    statString += namespace.join('.') + '.count' + this.config.globalSuffix + sets[key].values().length + ts_suffix;
    numStats += 1;
  }

  var namespace = this.globalNamespace.concat(prefixStats);
  if (this.config.legacyNamespace === true) {
    statString += prefixStats + '.numStats' + this.config.globalSuffix + numStats + ts_suffix;
    statString += 'stats.' + prefixStats + '.graphiteStats.calculationtime' + this.config.globalSuffix + (Date.now() - starttime) + ts_suffix;
    for (key in statsd_metrics) {
      statString += 'stats.' + prefixStats + '.' + key + this.config.globalSuffix + statsd_metrics[key] + ts_suffix;
    }
  } else {
    statString += namespace.join('.') + '.numStats' + this.config.globalSuffix + numStats + ts_suffix;
    statString += namespace.join('.') + '.graphiteStats.calculationtime' + this.config.globalSuffix + (Date.now() - starttime) + ts_suffix;
    for (key in statsd_metrics) {
      var the_key = namespace.concat(key);
      statString += the_key.join('.') + this.config.globalSuffix + statsd_metrics[key] + ts_suffix;
    }
  }
  this.postToGraphite(statString);

  if (this.debug) {
   this.logger.log('numStats: ' + numStats);
  }
};

GraphiteBackend.prototype.onStatusEvent = function graphite_status(writeCb) {
  for (var stat in this.graphiteStats) {
    writeCb(null, 'graphite', stat, this.graphiteStats[stat]);
  }
};

exports.init = function graphite_init(startup_time, config, events, logger) {
  new GraphiteBackend(startup_time, config, events, logger);
  return true;
};
