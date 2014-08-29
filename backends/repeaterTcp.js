/*jshint node:true, laxcomma:true */

var util = require('util');
var logger = require('../lib/logger');
var net = require('net');
var generic_pool = require('generic-pool');

function TCPRepeater(config, logger) {
    var self = this;
    this.debug = config.debug;
    this.logger = logger
    this.connectionPool = generic_pool.Pool({
        name: 'connectionPool',
        max: config.maxConnections,
        create: function(callback) {
            var conn = net.createConnection(config.port, config.host);
            conn.addListener('error', function (connectionException) {
                self.logger.log('TCP Repeater error: ' + connectionException);
                self.connectionPool.destroy(this)
                callback(connectionException, null);
            });
            conn.on('connect', function () {
                if (self.debug) {
                    self.logger.log("connected to " + config.host + ":" + config.port);
                }
                callback(null, this);
            });
        },
        destroy: function(conn) {
            if (self.debug) {
                self.logger.log("connection is destroyed");
            }
            conn.destroy();
        }
    });
}

TCPRepeater.prototype.process = function (packet, rinfo) {
    var self = this;
    self.connectionPool.acquire(function(err, conn) {
        if (err) {
            self.logger.log("connection error. data is lost: "+packet);
        }
        else {
            conn.write(packet + "\n");
        }
        self.connectionPool.release(conn);
    });
}

exports.init = function (startupTime, config, events, logger) {
    if (config.repeater.tcp && config.repeater.tcp.enabled){
        instance = new TCPRepeater(config.repeater.tcp, logger);
        events.on('packet', function (packet, rinfo) {
            instance.process(packet, rinfo);
        });
    }
    return true;
};