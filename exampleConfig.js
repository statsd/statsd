/*

Required Variables:

  graphiteHost:     hostname or IP of Graphite server
  graphitePort:     port of Graphite server
  port:             StatsD listening port [default: 8125]
  logFile:          StatsD daemon log file
  pidFile:          StatsD daemon pid file

Optional Variables:

  debug:            debug flag [default: false]
  debugInterval:    interval to print debug information [ms, default: 10000]
  dumpMessages:     log all incoming messages
  flushInterval:    interval (in ms) to flush to Graphite
  percentThreshold: for time information, calculate the Nth percentile
                    [%, default: 90]

*/
{
  graphitePort: 2003
, graphiteHost: "graphite.host.com"
, port: 8125
}
