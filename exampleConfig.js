/*

Required Variables:

  graphiteHost:     hostname or IP of Graphite server
  graphitePort:     port of Graphite server
  port:             StatsD listening port [default: 8125]

Optional Variables:

  debug:            debug flag [default: false]
  debugInterval:    interval to print debug information [ms, default: 10000]
  dumpMessages:     log all incoming messages
  flushInterval:    interval (in ms) to flush to Graphite
  percentThreshold: for time information, calculate the Nth percentile
                    [%, default: 90]

*/
{
  graphService: "graphite" // also available: "librato-metrics"
  , graphitePort: 2003
  , graphiteHost: "graphite.host.com"
//, libratoUser: "<librato email>"
//, libratoApiKey: "<librato api key>"
  , batch: 200
  , port: 8125
}
