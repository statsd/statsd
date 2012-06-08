/*
 * Flush stats to ElasticSearch (http://www.elasticsearch.org/)
 *
 * To enable this backend, include 'elastic' in the backends
 * configuration array:
 *
 *   backends: ['./backends/elastic'] 
 *  (if the config file is in the statsd folder)
 *
 * A sample configuration can be found in exampleElasticConfig.js
 *
 * This backend supports the following config options:
 *
 *   elasticHost:          hostname or IP of ElasticSearch server
 *   elasticPort:          port of Elastic Search Server
 *   elasticIndex:         Index of the ElasticSearch server where the metrics are to be saved (_index)
 *   elasticIndexType:     The type of the index to be saved with (_type)
 *   elasticFlushInterval: Right now, not being used and is the same as flushInterval, but hope to use this to make the logging to ES over a longer interval than for graphite
 */

var net = require('net'),
   util = require('util'),
   http = require('http');

var debug;
var flushInterval;
var elasticHost;
var elasticPort;
var elasticIndex;
var elasticIndexType;

var elasticStats = {};

var post_stats = function elastic_post_stats(statString) {
  if (elasticHost) {
    try {
      var elastic = require('../utils/httpReq')
	  elasticUrl = 'http://' + elasticHost + ':' + elasticPort + '/' + elasticIndex + '/' + elasticIndexType ; 
	  elastic.urlReq(elasticUrl,{
      method: 'POST',
      params: statString.toString() 
	}, function(body, res){

      });
	  

    } catch(e){
      if (debug) {
        util.log(e);
      }
      elasticStats.last_exception = Math.round(new Date().getTime() / 1000);
    }
  }
}

var flush_stats = function elastic_flush(ts, metrics) {
  var statString = '';
  var numStats = 0;
  var key;
  var message_array = new Array();

  ts = new Date()
  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var timers = metrics.timers;
  var pctThreshold = metrics.pctThreshold;

  for (key in counters) {
    var value = counters[key];
    var valuePerSecond = value / (flushInterval / 1000); // calculate "per second" rate

    //statString += 'stats.'        + key + ' ' + valuePerSecond + ' ' +  "\n";
    //statString += 'stats_counts.' + key + ' ' + value          + ' ' +  "\n";
    message_array.push(create_json(key + '.persecond',valuePerSecond,ts));
    message_array.push(create_json(key,value,ts));

    numStats += 1;
  }

  for (key in timers) {
    if (timers[key].length > 0) {
      var values = timers[key].sort(function (a,b) { return a-b; });
      var count = values.length;
      var min = values[0];
      var max = values[count - 1];

      var mean = min;
      var maxAtThreshold = max;

      var message = "";

      var key2;

      for (key2 in pctThreshold) {
        var pct = pctThreshold[key2];
        if (count > 1) {
          var thresholdIndex = Math.round(((100 - pct) / 100) * count);
          var numInThreshold = count - thresholdIndex;
          var pctValues = values.slice(0, numInThreshold);
          maxAtThreshold = pctValues[numInThreshold - 1];

          // average the remaining timings
          var sum = 0;
          for (var i = 0; i < numInThreshold; i++) {
            sum += pctValues[i];
          }

          mean = sum / numInThreshold;
        }

        var clean_pct = '' + pct;
        clean_pct.replace('.', '_');
    	message_array.push(create_json(key + '.timers.mean_' + clean_pct ,mean,ts));
    	message_array.push(create_json(key + '.timers.mean_' + clean_pct ,maxAtThreshold,ts));
      }

      message_array.push(create_json(key + '.timers.upper' ,max,ts));
      message_array.push(create_json(key + '.timers.lower' ,min,ts));
      message_array.push(create_json(key + '.timers.count' ,count,ts));
      //statString += message;

      numStats += 1;
    }
  }

  for (key in gauges) {
    message_array.push(create_json(key + '.gauges' , gauges[key],ts));
    numStats += 1;
  }

  for(var i = 0; i < message_array.length; i++ ) {
	post_stats(message_array[i].toString())
  };

};

var create_json = function create_elastic_json(entity, value, timestamp){
  result = {"entity" : entity , "value" : value , "timestamp" : timestamp} 
  return JSON.stringify(result);
}; 


var elastic_backend_status = function graphite_status(writeCb) {
  for (stat in elasticStats) {
    writeCb(null, 'elastic', stat, elasticStats[stat]);
  }
};

exports.init = function graphite_init(startup_time, config, events) {
  debug = config.debug;
  elasticHost = config.elasticHost;
  elasticPort = config.elasticPort;
  elasticIndex = config.elasticIndex;
  elasticIndexType = config.elasticIndexType;

  elasticStats.last_flush = startup_time;
  elasticStats.last_exception = startup_time;

  flushInterval = config.flushInterval;

  events.on('flush', flush_stats);
  events.on('status', elastic_backend_status);

  return true;
};

