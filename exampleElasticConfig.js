/*

Required Variables:

  port:             StatsD listening port [default: 8125]

Graphite Required Variables:

(Leave these unset to avoid sending stats to Graphite.
 Set debug flag and leave these unset to run in 'dry' debug mode -
 useful for testing statsd clients without a Graphite server.)

  graphiteHost:     hostname or IP of Graphite server
  graphitePort:     port of Graphite server

Optional Variables:

  backends:         an array of backends to load. Each backend must exist
                    by name in the directory backends/. If not specified,
                    the default graphite backend will be loaded.
  debug:            debug flag [default: false]
  address:          address to listen on over UDP [default: 0.0.0.0]
  port:             port to listen for messages on over UDP [default: 8125]
  mgmt_address:     address to run the management TCP interface on
                    [default: 0.0.0.0]
  mgmt_port:        port to run the management TCP interface on [default: 8126]
  debugInterval:    interval to print debug information [ms, default: 10000]
  dumpMessages:     log all incoming messages
  flushInterval:    interval (in ms) to flush to Graphite
  percentThreshold: for time information, calculate the Nth percentile(s)
                    (can be a single value or list of floating-point values)
                    [%, default: 90]
  keyFlush:         log the most frequently sent keys [object, default: undefined]
    interval:       how often to log frequent keys [ms, default: 0]
    percent:        percentage of frequent keys to log [%, default: 100]
    log:            location of log file for frequent keys [default: STDOUT]
  
  ElasticSearch related configurations:

  elasticHost:       	hostname or IP of ElasticSearch server
  elasticPort:       	port of Elastic Search Server
  elasticIndex:      	Index of the ElasticSearch server where the metrics are to be saved (_index)
  elasticIndexType:  	The type of the index to be saved with (_type)
  elasticFlushInterval: Right now, not being used and is the same as flushInterval, but hope to use this to make the logging to ES over a longer interval than for graphite

  NOTE: backends array includes both graphite and elasticsearch


*/
{
  port: 8125
, graphitePort: 2003
, graphiteHost: "localhost"
, elasticPort: 9200
, elasticHost: "localhost"
, elasticFlushInterval: 10000
, elasticIndex: "statsd"
, elasticIndexType: "stats"
, backends: ['./backends/graphite','./backends/elastic']
}

