/*
Fabian Jakobs <fabian@ajax.org>
http://ajax.org
*/

var dgram = require('dgram');

/**
 * Sends statistics to the stats daemon over UDP
 */
var StatsD = exports.StatsD = function(config) {
    this.config = config;
    this.queue = [];
}

;(function() {
    
    /**
     * Log timing information
     */
    this.timing = function(stat, time, sampleRate) {
        var stats = {};
        stats[stat] = parseInt(time) + "|ms";
        this.send(stats, sampleRate);
    };
    
    /**
     * Increments one or more stats counters
     */
    this.increment = function(stat, sampleRate) {
        this.updateStats(stat, 1, sampleRate);
    };

    /**
     * Decrements one or more stats counters
     */
    this.decrement = function(stat, sampleRate) {
        this.updateStats(stat, -1, sampleRate);
    };
    
    /**
     * Updates one or more stats counters by arbitrary amounts
     */
    this.updateStats = function(stats, delta, sampleRate) {
        if (!Array.isArray(stats))
            stats = [stats];
        
        var data = {};
        for (var i = 0; i<stats.length; i++)
            data[stats[i]] = delta + "|c";
        
        this.send(data, sampleRate);
    };
    
    /**
     * prepeare packages to be send
     */
    this.send = function(data, sampleRate) {
        sampleRate = sampleRate || 1;
        
        var sampleData = {};
        
        if (sampleRate < 1) {
            if (Math.random() <= sampleRate) {
                for (var stat in data)
                    sampleData[stat] = data[stat] + "|@" + sampleRate;
            }
        }
        else {
            sampleData = data;
        }
        
        for (var stat in sampleData)
            this.queue.push(new Buffer(stat + ":" + sampleData[stat]));
            
        this._flush();
    };
    
    /**
     * Flush send queue
     */
    this._flush = function() {
        var self = this;
        
        if (this._flushing)
            return;
            
        this._flushing = true;
        var config = this.config;
        
        var client = dgram.createSocket("udp4");
        
        (function loop(next) {
            var message = self.queue.shift();
            if (!message)
                return next();
            
            client.send(message, 0, message.length, config.port, config.host, function(err) {
                // fire and forget - ignore potential errors
                loop(next);
            });
        })(function() {
            self._flushing = false;
            client.close();
        });
    };
    
}).call(StatsD.prototype);


// Example usage
if (!module.parent) {
    var stats = new StatsD({
        port: 8125,
        host: "0.0.0.0"
    });
    
    stats.increment("user.create");
    stats.increment("user.create", 0.5);
    stats.decrement("project.delete");
    stats.decrement("project.delete", 0.5);
}