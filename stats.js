/*jshint node:true, laxcomma:true */
'use strict';

var dgram  = require('dgram')
  , util    = require('util')
  , net    = require('net')
  , config = require('./lib/config')
  , helpers = require('./lib/helpers')
  , fs     = require('fs')
  , events = require('events')
  , logger = require('./lib/logger')
  , set = require('./lib/set')
  , pm = require('./lib/process_metrics')
  , process_mgmt = require('./lib/process_mgmt')
  , mgmt = require('./lib/mgmt_console');


function StatsD() {
	this.keyCounter = {};
	this.counters = {};
	this.timers = {};
	this.timer_counters = {};
	this.gauges = {};
	this.sets = {};
	this.counter_rates = {};
	this.timer_data = {};
	this.pctThreshold = undefined;
	this.flushInterval = undefined;
	this.keyFlushInt = undefined;
	this.server = undefined;
	this.mgmtServer = undefined;

	this.startup_time = Math.round(new Date().getTime() / 1000);

	this.backendEvents = new events.EventEmitter();
	this.healthStatus = config.healthStatus || 'up';
	this.old_timestamp = 0;

	this.timestamp_lag_namespace = undefined;
	this.prefixStats = '';

	this.bad_lines_seen = '';
	this.packets_received = '';

	this.conf = undefined;


	this.stats = {
	  messages: {
	    last_msg_seen: this.startup_time,
	    bad_lines_seen: 0
	  }
	};

}

// Load and init the backend from the backends/ directory.
StatsD.prototype.loadBackend = function loadBackend(config, name) {
  var backendmod = require(name);

  if (config.debug) {
    l.log('Loading backend: ' + name, 'DEBUG');
  }

  var ret = backendmod.init(this.startup_time, config, this.backendEvents, l);
  if (!ret) {
    l.log('Failed to load backend: ' + name);
    process.exit(1);
  }
};



// Flush metrics to each backend.
StatsD.prototype.flushMetrics = function flushMetrics() {
	var self = this;
  var time_stamp = Math.round(new Date().getTime() / 1000);
  if (this.old_timestamp > 0) {
    this.gauges[this.timestamp_lag_namespace] = (time_stamp - this.old_timestamp - (Number(self.conf.flushInterval)/1000));
  }
  this.old_timestamp = time_stamp;

  var metrics_hash = {
    counters: this.counters,
    gauges: this.gauges,
    timers: this.timers,
    timer_counters: this.timer_counters,
    sets: this.sets,
    counter_rates: this.counter_rates,
    timer_data: this.timer_data,
    pctThreshold: this.pctThreshold,
    histogram: self.conf.histogram
  };

  // After all listeners, reset the stats
  this.backendEvents.once('flush', function clear_metrics(ts, metrics) {
    // TODO: a lot of this should be moved up into an init/constructor so we don't have to do it every
    // single flushInterval....
    // allows us to flag all of these on with a single config but still override them individually
    self.conf.deleteIdleStats = self.conf.deleteIdleStats !== undefined ? self.conf.deleteIdleStats : false;
    if (self.conf.deleteIdleStats) {
      self.conf.deleteCounters = self.conf.deleteCounters !== undefined ? self.conf.deleteCounters : true;
      self.conf.deleteTimers = self.conf.deleteTimers !== undefined ? self.conf.deleteTimers : true;
      self.conf.deleteSets = self.conf.deleteSets !== undefined ? self.conf.deleteSets : true;
      self.conf.deleteGauges = self.conf.deleteGauges !== undefined ? self.conf.deleteGauges : true;
    }

    // Clear the counters
    self.conf.deleteCounters = self.conf.deleteCounters || false;
    for (var counter_key in metrics.counters) {
      if (self.conf.deleteCounters) {
        if ((counter_key.indexOf('packets_received') != -1) || (counter_key.indexOf('bad_lines_seen') != -1)) {
          metrics.counters[counter_key] = 0;
        } else {
         delete(metrics.counters[counter_key]);
        }
      } else {
        metrics.counters[counter_key] = 0;
      }
    }

    // Clear the timers
    self.conf.deleteTimers = self.conf.deleteTimers || false;
    for (var timer_key in metrics.timers) {
      if (self.conf.deleteTimers) {
        delete(metrics.timers[timer_key]);
        delete(metrics.timer_counters[timer_key]);
      } else {
        metrics.timers[timer_key] = [];
        metrics.timer_counters[timer_key] = 0;
     }
    }

    // Clear the sets
    self.conf.deleteSets = self.conf.deleteSets || false;
    for (var set_key in metrics.sets) {
      if (self.conf.deleteSets) {
        delete(metrics.sets[set_key]);
      } else {
        metrics.sets[set_key] = new set.Set();
      }
    }

	// normally gauges are not reset.  so if we don't delete them, continue to persist previous value
    self.conf.deleteGauges = self.conf.deleteGauges || false;
    if (self.conf.deleteGauges) {
      for (var gauge_key in metrics.gauges) {
        delete(metrics.gauges[gauge_key]);
      }
    }
  });

  pm.process_metrics(metrics_hash, self.flushInterval, time_stamp, function emitFlush(metrics) {
    self.backendEvents.emit('flush', time_stamp, metrics);
  });

};

// Global for the logger
var l;


StatsD.prototype.configFile = function() {
	config.configFile(process.argv[2], this.onConfigFileRed.bind(this));
};

StatsD.prototype.onUdpPacketReceived = function (msg, rinfo) {
  this.backendEvents.emit('packet', msg, rinfo);
  this.counters[this.packets_received]++;
  var packet_data = msg.toString();
  var metrics = [ packet_data ] ;
  if (packet_data.indexOf('\n') > -1) {
    metrics = packet_data.split('\n');
  }

  for (var midx in metrics) {
    if (metrics[midx].length === 0) {
      continue;
    }
    if (config.dumpMessages) {
      l.log(metrics[midx].toString());
    }
    var bits = metrics[midx].toString().split(':');
    var key = bits.shift()
                  .replace(/\s+/g, '_')
                  .replace(/\//g, '-')
                  .replace(/[^a-zA-Z_\-0-9\.]/g, '');

    if (this.keyFlushInterval > 0) {
      if (! this.keyCounter[key]) {
        this.keyCounter[key] = 0;
      }
      this.keyCounter[key] += 1;
    }

    if (bits.length === 0) {
      bits.push('1');
    }

    for (var i = 0; i < bits.length; i++) {
      var sampleRate = 1;
      var fields = bits[i].split('|');
      if (!helpers.is_valid_packet(fields)) {
          l.log('Bad line: ' + fields + ' in msg "' + metrics[midx] +'"');
          this.counters[this.bad_lines_seen]++;
          this.stats.messages.bad_lines_seen++;
          continue;
      }
      if (fields[2]) {
        sampleRate = Number(fields[2].match(/^@([\d\.]+)/)[1]);
      }

      var metric_type = fields[1].trim();
      if (metric_type === 'ms') {
        if (! this.timers[key]) {
          this.timers[key] = [];
          this.timer_counters[key] = 0;
        }
        this.timers[key].push(Number(fields[0] || 0));
        this.timer_counters[key] += (1 / sampleRate);
      } else if (metric_type === 'g') {
        if (this.gauges[key] && fields[0].match(/^[-+]/)) {
          this.gauges[key] += Number(fields[0] || 0);
        } else {
          this.gauges[key] = Number(fields[0] || 0);
        }
      } else if (metric_type === 's') {
        if (! this.sets[key]) {
          this.sets[key] = new set.Set();
        }
        this.sets[key].insert(fields[0] || '0');
      } else {
        if (! this.counters[key]) {
          this.counters[key] = 0;
        }
        this.counters[key] += Number(fields[0] || 1) * (1 / sampleRate);
      }
    }
  }

  this.stats.messages.last_msg_seen = Math.round(new Date().getTime() / 1000);
};

StatsD.prototype.onTcpPacketReceived = function(stream, data) {
  var cmdline = data.trim().split(' ');
  var cmd = cmdline.shift();

  switch(cmd) {
    case 'help':
      stream.write('Commands: stats, counters, timers, gauges, delcounters, deltimers, delgauges, health, quit\n\n');
      break;

    case 'health':
      if (cmdline.length > 0) {
        var cmdaction = cmdline[0].toLowerCase();
        if (cmdaction === 'up') {
          this.healthStatus = 'up';
        } else if (cmdaction === 'down') {
          this.healthStatus = 'down';
        }
      }
      stream.write('health: ' + this.healthStatus + '\n');
      break;

    case 'stats':
      var now    = Math.round(new Date().getTime() / 1000);
      var uptime = now - this.startup_time;

      stream.write('uptime: ' + uptime + '\n');

      var stat_writer = function(group, metric, val) {
        var delta;

        if (metric.match('^last_')) {
          delta = now - val;
        }
        else {
          delta = val;
        }

        stream.write(group + '.' + metric + ': ' + delta + '\n');
      };

      // Loop through the base stats
      for (var group in this.stats) {
        for (var metric in this.stats[group]) {
          stat_writer(group, metric, this.stats[group][metric]);
        }
      }

      this.backendEvents.once('status', function() {
        stream.write('END\n\n');
      });

      // Let each backend contribute its status
      this.backendEvents.emit('status', function(err, name, stat, val) {
        if (err) {
          l.log('Failed to read stats for backend ' +
                  name + ': ' + err);
        } else {
          stat_writer(name, stat, val);
        }
      });

      break;

    case 'counters':
      stream.write(util.inspect(this.counters) + '\n');
      stream.write('END\n\n');
      break;

    case 'timers':
      stream.write(util.inspect(this.timers) + '\n');
      stream.write('END\n\n');
      break;

    case 'gauges':
      stream.write(util.inspect(this.gauges) + '\n');
      stream.write('END\n\n');
      break;

    case 'delcounters':
      mgmt.delete_stats(this.counters, cmdline, stream);
      break;

    case 'deltimers':
      mgmt.delete_stats(this.timers, cmdline, stream);
      break;

    case 'delgauges':
      mgmt.delete_stats(this.gauges, cmdline, stream);
      break;

    case 'quit':
      stream.end();
      break;

    default:
      stream.write('ERROR\n');
      break;
  }

};

StatsD.prototype.onTcpConnetionActive = function(stream) {
  stream.setEncoding('ascii');

  stream.on('error', function(err) {
    l.log('Caught ' + err +', Moving on');
  });

  stream.on('data', this.onTcpPacketReceived.bind(this, stream));
};

StatsD.prototype.onConfigFileRed = function (config) {
	var self = this;
  self.conf = config;

  process_mgmt.init(config);

  l = new logger.Logger(config.log || {});

  // setup config for stats prefix
  self.prefixStats = config.prefixStats;
  self.prefixStats = self.prefixStats !== undefined ? self.prefixStats : 'statsd';

  self.conf.prefixStats = self.prefixStats;

  //setup the names for the stats stored in counters{}
  self.bad_lines_seen   = self.prefixStats + '.bad_lines_seen';
  self.packets_received = self.prefixStats + '.packets_received';
  self.timestamp_lag_namespace = self.prefixStats + '.timestamp_lag';

  //now set to zero so we can increment them
  self.counters[self.bad_lines_seen]   = 0;
  self.counters[self.packets_received] = 0;

  this.keyFlushInterval = Number((this.conf.keyFlush && this.conf.keyFlush.interval) || 0);

  if (self.server === undefined) {
    var udp_version = config.address_ipv6 ? 'udp6' : 'udp4';
    self.server = dgram.createSocket(udp_version, this.onUdpPacketReceived.bind(this));
    self.mgmtServer = net.createServer(this.onTcpConnetionActive.bind(this));
    self.server.bind(config.port || 8125, config.address || undefined);
    self.mgmtServer.listen(config.mgmt_port || 8126, config.mgmt_address || undefined);

    util.log('server is up');

    self.pctThreshold = config.percentThreshold || 90;
    if (!Array.isArray(self.pctThreshold)) {
      self.pctThreshold = [ self.pctThreshold ]; // listify percentiles so single values work the same
    }

    self.flushInterval = Number(config.flushInterval || 10000);
    config.flushInterval = self.flushInterval;

    if (config.backends) {
      for (var i = 0; i < config.backends.length; i++) {
        self.loadBackend(config, config.backends[i]);
      }
    } else {
      // The default backend is graphite
      self.loadBackend(config, './backends/graphite');
    }
    // Setup the flush timer
    setInterval(self.flushMetrics.bind(self), self.flushInterval);

    if (this.keyFlushInterval > 0) {
      var keyFlushPercent = Number((config.keyFlush && config.keyFlush.percent) || 100);
      var keyFlushLog = config.keyFlush && config.keyFlush.log;

      self.keyFlushInt = setInterval(function () {
        var sortedKeys = [];

        for (var key in self.keyCounter) {
          sortedKeys.push([key, self.keyCounter[key]]);
        }

        sortedKeys.sort(function(a, b) { return b[1] - a[1]; });

        var logMessage = '';
        var timeString = (new Date()) + '';

        // only show the top "keyFlushPercent" keys
        for (var i = 0, e = sortedKeys.length * (keyFlushPercent / 100); i < e; i++) {
          logMessage += timeString + ' count=' + sortedKeys[i][1] + ' key=' + sortedKeys[i][0] + '\n';
        }

        if (keyFlushLog) {
          var logFile = fs.createWriteStream(keyFlushLog, {flags: 'a+'});
          logFile.write(logMessage);
          logFile.end();
        } else {
          process.stdout.write(logMessage);
        }

        // clear the counter
        self.keyCounter = {};
      }, this.keyFlushInterval);
    }
  }

	process.on('exit', function () {
	  self.flushMetrics();
	});
};


var statsd = new StatsD();
statsd.configFile();
