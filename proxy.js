var dgram    = require('dgram')
  , net      = require('net')
  , events   = require('events')
  , logger = require('./lib/logger')
  , hashring = require('hashring')
  , cluster = require('cluster')
  , configlib   = require('./lib/config')
  , trie = require("./lib/trie");

var packet   = new events.EventEmitter();
var node_status = [];
var node_groups, node_hosts;
var config;
var l;  // logger
var healthStatus = 'up';
var proxy_port = process.argv[3];
var mgmt_port = process.argv[4];

configlib.configFile(process.argv[2], function (conf, oldConfig) {
  config = conf;
  node_groups = config.node_groups;
  node_hosts = config.node_hosts;
  node_ports = config.node_ports;

  var udp_version = config.udp_version;
  l = new logger.Logger(config.log || {});
  var others_hashring = null;
  var logPrefix = "[" + process.pid + "][:" + proxy_port + "]";
  var log = function(msg, type) {
    l.log(logPrefix + msg, type);
  }
  var prefix_to_ring_lists = {
      length: 0
      , lists: []
      , addKeyValue: function(prefix, ring) {
          this.lists.push([prefix, ring]);
          this.length++;
      }
      , getValue: function(key) {
         for (var i = 0; i < this.lists.length; i++) {
             var pair = this.lists[i];
             if (key.indexOf(pair[0]) == 0) {
                 return pair[1];
             }
         }
         return null;
      }
  };

  var group_ring_of_key = (node_groups.length >= 5) ? new trie.TrieTree() : prefix_to_ring_lists;

  var forkCount = config.forkCount;
  if (forkCount === 'auto') {
    forkCount = require('os').cpus().length;
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

  var expandToHostPortInfoFromGroupNodesConfig = function(group_nodes) {
      var expanded_host_port_pairs = [];
      group_nodes.forEach(function(gnode, index, array) {
          var host_ip = gnode['host_ip'], port = gnode['port'], admin_port = gnode['adminPort'];
          if (host_ip) {
             expanded_host_port_pairs.push({host: host_ip, port: port, adminport: admin_port});
          } else {
             node_hosts.forEach(function(host, index, array) {
                expanded_host_port_pairs.push({host: host, port: port, adminport: admin_port});
             });
          }
      });
      return expanded_host_port_pairs;
  }

  var hash_ring_config = {
      "max cache size": config.cacheSize || 10000
  };
  //load the node_ring object with the available nodes and a weight of 100
  // weight is currently arbitrary but the same for all
  node_groups.forEach(function(group, index, array) {
      var group_id = group['id'];
      var group_ring = {};
      var group_nodes = group['nodes'];
      var key_prefixs = group['key_prefixs'];
      var expanded_info = group['expanded_nodes'] || expandToHostPortInfoFromGroupNodesConfig(group_nodes);
      group['expanded_nodes'] = expanded_info;

      var group_rings = function() {
          expanded_info.forEach(function(info) {
             group_ring[info["host"] + ":" + info['port']] = 100;
          })
      };

      if (key_prefixs == undefined) {
          group_rings();
          others_hashring = new hashring(group_ring, "md5", hash_ring_config);
          group['ring'] = others_hashring;
      } else {
          group_rings();
          var ring = new hashring(group_ring, "md5", hash_ring_config);
          group["ring"] = ring;
          if (key_prefixs && key_prefixs.length > 0) {
              key_prefixs.forEach(function(prefix) {
                  group_ring_of_key.addKeyValue(prefix, ring);
              })}
      }
  });

  if (others_hashring == null && group_ring_of_key.length == 0) {
      var ring_dict = {};
      node_hosts.forEach(function(host) {
          node_ports.forEach(function(port) {
             ring_dict[host + ":" + port] = 100;
          });
      });
      others_hashring = new hashring(ring_dict, "md5", hash_ring_config);
  }

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

  var mgmtServer = net.createServer(function(stream) {
    stream.setEncoding('ascii');

    stream.on('error', function(err) {
      l.log('Caught ' + err +', Moving on');
    });

    stream.on('data', function(data) {
      var cmdline = data.trim().split(" ");
      var cmd = cmdline.shift();

      switch(cmd) {
        case "help":
          stream.write("Commands: health, quit\n\n");
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
          stream.write(healthStatus + "\n");
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

  var client = dgram.createSocket(udp_version);
  // Listen for the send message, and process the metric key and msg
  packet.on('send', function(key, msg) {
    // get the ring of the group key belongs
    var ring = group_ring_of_key.getValue(key) || others_hashring;

    // retreives the destination for this key
    var statsd_host = ring.get(key);
    

    // break the retreived host to pass to the send function
    if (statsd_host === undefined) {
      log('Warning: No backend statsd nodes available!key='+ key+ " msg=" + msg.toString());
    } else {
      var host_config = statsd_host.split(':');
      // Send the mesg to the backend
      client.send(msg, 0, msg.length, host_config[1], host_config[0]);
    }
  });

  // Bind the listening udp server to the configured port and host
  server.bind(proxy_port, "0.0.0.0");
  mgmtServer.listen(mgmt_port || 8126, "0.0.0.0");

  // Set the interval for healthchecks
  setInterval(doHealthChecks, config.checkInterval || 10000);

  // Perform health check on all nodes
  function doHealthChecks() {
      node_groups.forEach(function(group) {
          var group_id = group['id'];
          var expanded_group_nodes = group['expanded_nodes'];
          var ring = group['ring'];
          expanded_group_nodes.forEach(function(node){
              healthcheck(node, group_id, ring);
          });
      });
  }

  // Perform health check on node
  function healthcheck(node, node_group, group_hashring) {
    var node_id = node.host + ':' + node.port;
    var client = net.connect({port: node.adminport, host: node.host},
        function() {
      client.write('health\r\n');
    });
    client.on('data', function(data) {
      var health_status = data.toString().trim();
      client.end();
      if (health_status.indexOf('up') < 0) {
        if (node_status[node_id] === undefined) {
          node_status[node_id] = 1;
        } else {
          node_status[node_id]++;
        }
        if (node_status[node_id] < 2) {
          log('Removing node ' + node_id + ' from the ring of group ' + node_group + '.');
          if (group_hashring) {
              group_hashring.remove(node_id);
          }
        }
      } else {
        if (node_status[node_id] !== undefined) {
          if (node_status[node_id] > 0) {
            var new_server = {};
            new_server[node_id] = 100;
            log('Adding node ' + node_id + ' to the ring.');
            if (group_hashring) {
                group_hashring.add(new_server);
            }
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
          if (group_hashring) {
              group_hashring.remove(node_id);
          }
        }
      } else {
        log('Error during healthcheck on node ' + node_id + ' with ' + e.code);
      }
    });
  }

});
