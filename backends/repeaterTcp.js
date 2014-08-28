/*jshint node:true, laxcomma:true */

var util = require('util')
    , dgram = require('dgram')
    , logger = require('../lib/logger');

var net = require('net');
var generic_pool = require('generic-pool');

var l;
var debug;
var connectionConfig;

var connectionPool = generic_pool.Pool({
    name: 'connectionPool',
    max: 10,
    create: function(callback) {
        var conn = net.createConnection(connectionConfig.port, connectionConfig.host);
        conn.addListener('error', function (connectionException) {
            l.log(connectionException);
            callback(connectionException, this);
        });
        conn.on('connect', function () {
            l.log("connected to "+connectionConfig.host+":"+connectionConfig.port);
            callback(null, this);
        });
    },
    destroy: function(conn) {
        l.log("connection is destroyed");
        conn.destroy();
    }
});

function RepeaterTcpBackend(startupTime, config, emitter) {
    emitter.on('packet', function (packet, rinfo) {
        connectionPool.acquire(function(err, conn) {
            if (err) {
                l.log("connection error. data is lost: "+packet);
            }
            else {
                conn.write(packet + "\n");
            }
            connectionPool.release(conn);
        });
    });
}

exports.init = function (startupTime, config, events, logger) {
    l = logger;
    l.log("initialized RepeaterTcpBackend");
    connectionConfig = config.repeaterTcp || {}
    l.log("connecting by config "+JSON.stringify(connectionConfig));

    var instance = new RepeaterTcpBackend(startupTime, config, events);
    debug = config.debug;
    return true;
};
