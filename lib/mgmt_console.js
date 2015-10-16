/*jshint node:true, laxcomma:true */

var net  = require('net'),
    util = require('util');

function MgmtServer(options) {

  // Initialization
  var self = this;

  this.config = options.config;
  this.backendEvents = options.backendEvents;
  this.l = options.l;
  this.healthStatus = options.healthStatus;
  this.stats = options.stats;
  this.metricsHash = options.metricsHash;

  this.running = false;
  this.mgmt_server = null;

  this.isRunning = function(){
    return self.running;
  };

  this.setConfig = function(config){
    self.config = config;
  };

  // start the server
  this.start = function(){
    self.mgmt_server.listen(self.config.mgmt_port || 8126, self.config.mgmt_address || undefined);
    self.l.log("MgmtServer Started");
  };

  this.stop = function(){
    self.mgmt_server.close();
    self.l.log("MgmtServer closed");
  }

  /**
   * delete_stats - delete all matching statistics
   *
   * Side effect notes: this function works by altering stats_type in place,
   *   and calls stream.write(str) to display user feedback.
   *
   * @param stats_type array of all statistics of this type (eg~ timers) to delete from
   * @param cmdline array of all requested deletions, which can be fully qualified,
   *   or end in a .* to delete a folder, like stats.temp.*
   * @param stream buffer output for for all outgoing user feedback
   */
  this.delete_stats = function(stats_type, cmdline, stream){
    //for each metric requested on the command line
    for (var index in cmdline) {

      //get a list of deletable metrics that match the request
      deletable = existing_stats(stats_type, cmdline[index]);

      //warn if no matches
      if (deletable.length === 0) {
        stream.write("metric " + cmdline[index] + " not found\n");
      }

      //delete all requested metrics
      for (var del_idx in deletable) {
        delete stats_type[deletable[del_idx]];
        stream.write("deleted: " + deletable[del_idx] + "\n");
      }
    }
    stream.write("END\n\n");
  };

  /**
   * existing_stats - find fully qualified matches for the requested stats bucket
   *
   * @param stats_type array of all statistics of this type (eg~ timers) to match
   * @param bucket string to search on, which can be fully qualified,
   *   or end in a .* to search for a folder, like stats.temp.*
   *
   * @return array of fully qualified stats that match the specified bucket. if
   *   no matches, an empty array is a valid response
   */
  this.existing_stats = function(stats_type, bucket){
    matches = [];

    //typical case: one-off, fully qualified
    if (bucket in stats_type) {
      matches.push(bucket);
    }

    //special case: match a whole 'folder' (and subfolders) of stats
    if (bucket.slice(-2) == ".*") {
      var folder = bucket.slice(0,-1);

      for (var name in stats_type) {
        //check if stat is in bucket, ie~ name starts with folder
        if (name.substring(0, folder.length) == folder) {
          matches.push(name);
        }
      }
    }

    return matches;
  };

  // initialization
  this.init = function(){
    var l = self.l;
    var config = self.config;
    var backendEvents = self.backendEvents;
    var healthStatus = self.healthStatus;
    var stats = self.stats;
    var metricsHash = self.metricsHash;
    var running = self.running;

    self.mgmt_server = net.createServer(function(stream) {
      stream.setEncoding('ascii');

      stream.on('listening', function() {
        running = true;
      });

      stream.on('end', function() {
        running = false;
      });

      stream.on('error', function(err) {
        l.log('Caught ' + err +', Moving on');
      });

      stream.on('data', function(data) {
        var cmdline = data.trim().split(" ");
        var cmd = cmdline.shift();

        switch(cmd) {
          case "help":
            stream.write("Commands: stats, counters, timers, gauges, delcounters, deltimers, delgauges, health, config, quit\n\n");
            break;

          case "config":
            stream.write("\n");
            for (var prop in config) {
              if (!config.hasOwnProperty(prop)) {
                continue;
              }
              if (typeof config[prop] !== 'object') {
                stream.write(prop + ": " + config[prop] + "\n");
                continue;
              }
              subconfig = config[prop];
              for (var subprop in subconfig) {
                if (!subconfig.hasOwnProperty(subprop)) {
                  continue;
                }
                stream.write(prop + " > " + subprop + ": " + subconfig[subprop] + "\n");
              }
            }
            break;

          case "health":
            if (cmdline.length > 0) {
              var cmdaction = cmdline[0].toLowerCase();
              if (cmdaction === 'up') {
                healthStatus = 'up';
              } else if (cmdaction === 'down') {
                healthStatus = 'down';
              }
            }
            stream.write("health: " + healthStatus + "\n");
            break;

          case "stats":
            var now    = Math.round(new Date().getTime() / 1000);
            var uptime = now - stats.startup_time;

            stream.write("uptime: " + uptime + "\n");

            var stat_writer = function(group, metric, val) {
              var delta;

              if (metric.match("^last_")) {
                delta = now - val;
              }
              else {
                delta = val;
              }

              stream.write(group + "." + metric + ": " + delta + "\n");
            };

            // Loop through the base stats
            for (var group in stats) {
              for (var metric in stats[group]) {
                stat_writer(group, metric, stats[group][metric]);
              }
            }

            backendEvents.once('status', function(writeCb) {
              stream.write("END\n\n");
            });

            // Let each backend contribute its status
            backendEvents.emit('status', function(err, name, stat, val) {
              if (err) {
                l.log("Failed to read stats for backend " +
                  name + ": " + err);
              } else {
                stat_writer(name, stat, val);
              }
            });

            break;

          case "counters":
            stream.write(util.inspect(metricsHash.counters) + "\n");
            stream.write("END\n\n");
            break;

          case "timers":
            stream.write(util.inspect(metricsHash.timers) + "\n");
            stream.write("END\n\n");
            break;

          case "gauges":
            stream.write(util.inspect(metricsHash.gauges) + "\n");
            stream.write("END\n\n");
            break;

          case "delcounters":
            self.delete_stats(metricsHash.counters, cmdline, stream);
            break;

          case "deltimers":
            self.delete_stats(metricsHash.timers, cmdline, stream);
            break;

          case "delgauges":
            self.delete_stats(metricsHash.gauges, cmdline, stream);
            break;

          case "quit":
            stream.end();
            break;

          default:
            stream.write("ERROR\n");
            break;
        }

      });
    });

  };
  this.init();
}

module.exports = MgmtServer;
