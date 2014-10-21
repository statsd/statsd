var dgram    = require('dgram')
  , net      = require('net')
  , events   = require('events')
  , logger = require('./lib/logger')
  , hashring = require('hashring')
  , cluster = require('cluster')
  , configlib   = require('./lib/config');

var packet   = new events.EventEmitter();
var node_status = [];
var node_ring = {};
var config;
var l;  // logger

configlib.configFile(process.argv[2], function (conf, oldConfig) {
  config = conf;
  var udp_version = config.udp_version
    ,       nodes = config.nodes;
  l = new logger.Logger(config.log || {});

  var forkCount = config.forkCount;
  if (forkCount === 'auto') {
    forkCount = require('os').cpus().length;
  }

  var logPrefix = "[" + process.pid + "] ";
  var log = function(msg, type) {
    l.log(logPrefix + msg, type);
  }


  if (forkCount > 1 && cluster.isMaster) {
    logPrefix += "[master] ";
    log("forking " + forkCount + " childs");

    for (var i = 0; i < forkCount; i++) {
      cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
      log('worker ' + worker.process.pid + ' died with exit code:' + code + " restarting", 'ERROR');
      cluster.fork();
    });
    return;
  }

  //load the node_ring object with the available nodes and a weight of 100
  // weight is currently arbitrary but the same for all
  nodes.forEach(function(element, index, array) {
    node_ring[element.host + ':' + element.port] = 100;
  });

  var ring = new hashring(
    node_ring, 'md5', {
      'max cache size': config.cacheSize || 10000,
      //We don't want duplicate keys sent so replicas set to 0
      'replicas': 0
    });

  // Do an initial rount of health checks prior to starting up the server
  doHealthChecks();


  // Setup the udp listener
  var server = dgram.createSocket(udp_version, function (msg, rinfo) {
    // Convert the raw packet to a string (defaults to UTF8 encoding)
    var packet_data = msg.toString();
    // If the packet contains a \n then it contains multiple metrics
    if (packet_data.indexOf("\n") > -1) {
      var metrics;
      metrics = packet_data.split("\n");
      // Loop through the metrics and split on : to get mertric name for hashing
      for (var midx in metrics) {
        var current_metric = metrics[midx];
        var bits = current_metric.split(':');
        var key = bits.shift();
        if (current_metric !== '') {
          var new_msg = new Buffer(current_metric);
          packet.emit('send', key, new_msg);
        }
      }

    } else {
      // metrics needs to be an array to fake it for single metric packets
      var current_metric = packet_data;
      var bits = current_metric.split(':');
      var key = bits.shift();
      if (current_metric !== '') {
        packet.emit('send', key, msg);
      }
    }
  });

  var client = dgram.createSocket(udp_version);
  // Listen for the send message, and process the metric key and msg
  packet.on('send', function(key, msg) {
    // retreives the destination for this key
    var statsd_host = ring.get(key);

    // break the retreived host to pass to the send function
    if (statsd_host === undefined) {
      log('Warning: No backend statsd nodes available!');
    } else {
      var host_config = statsd_host.split(':');

      // Send the mesg to the backend
      client.send(msg, 0, msg.length, host_config[1], host_config[0]);
    }
  });

  // Bind the listening udp server to the configured port and host
  server.bind(config.port, config.host || undefined);

  // Set the interval for healthchecks
  setInterval(doHealthChecks, config.checkInterval || 10000);

  // Perform health check on all nodes
  function doHealthChecks() {
    nodes.forEach(function(element, index, array) {
      healthcheck(element);
    });
  }

  // Perform health check on node
  function healthcheck(node) {
    var node_id = node.host + ':' + node.port;
    var client = net.connect({port: node.adminport, host: node.host},
        function() {
      client.write('health\r\n');
    });
    client.on('data', function(data) {
      var health_status = data.toString();
      client.end();
      if (health_status.indexOf('up') < 0) {
        if (node_status[node_id] === undefined) {
          node_status[node_id] = 1;
        } else {
          node_status[node_id]++;
        }
        if (node_status[node_id] < 2) {
          log('Removing node ' + node_id + ' from the ring.');
          ring.remove(node_id);
        }
      } else {
        if (node_status[node_id] !== undefined) {
          if (node_status[node_id] > 0) {
            var new_server = {};
            new_server[node_id] = 100;
            log('Adding node ' + node_id + ' to the ring.');
            ring.add(new_server);
          }
        }
        node_status[node_id] = 0;
      }
    });
    client.on('error', function(e) {
      if (e.code == 'ECONNREFUSED') {
        if (node_status[node_id] === undefined) {
          node_status[node_id] = 1;
        } else {
          node_status[node_id]++;
        }
        if (node_status[node_id] < 2) {
          log('Removing node ' + node_id + ' from the ring.');
          ring.remove(node_id);
        }
      } else {
        log('Error during healthcheck on node ' + node_id + ' with ' + e.code);
      }
    });
  }

});
