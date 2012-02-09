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

  debug:            debug flag [default: false]
  debugInterval:    interval to print debug information [ms, default: 10000]
  dumpMessages:     log all incoming messages
  flushInterval:    interval (in ms) to flush to Graphite
  percentThreshold: for time information, calculate the Nth percentile
                    [%, default: 90]
  keyFlush:         log the most frequently sent keys [default: false]
  keyFlushPercent:  log the top N% of frequent keys [%, default: 100]
  keyFlushInterval: how often to log frequent keys (in ms)
  keyFlushLog:      location of log file for frequeent keys [default: STDOUT]

*/
{
  graphitePort: 2003
, graphiteHost: "graphite.host.com"
, port: 8125
}
