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
  keyFlush:         log the most frequently sent keys [object, default: undefined]
    interval:       how often to log frequent keys [ms, default: 0]
    percent:        percentage of frequent keys to log [%, default: 100]
    log:            location of log file for frequent keys [default: STDOUT]

  console:
    prettyprint:    whether to prettyprint the console backend
                    output [true or false, default: true]

  log:              log settings [object, default: undefined]
    backend:        where to log: stdout or syslog [string, default: stdout]
    application:    name of the application for syslog [string, default: statsd]
    level:          log level for [node-]syslog [string, default: LOG_INFO]

  repeater:         an array of hashes of the for host: and port:
                    that details other statsd servers to which the received
                    packets should be "repeated" (duplicated to).
                    e.g. [ { host: '10.10.10.10', port: 8125 },
                           { host: 'observer', port: 88125 } ]
  timer:
    percentThreshold: calculate the Nth percentile(s)
                    (can be a single value or list of floating-point values)
                    [%, default: 90]
    histogram:      an array of mappings of strings (to match metrics) and
                    corresponding ordered non-inclusive upper limits of bins.
                    For all matching metrics, histograms are maintained over
                    time by writing the frequencies for all bins.
                    'inf' means infinity. A lower limit of 0 is assumed.
                    default: [], meaning no histograms for any timer.
                    First match wins.  examples:
                    * histogram to only track render durations, with unequal
                      class intervals and catchall for outliers:
                      [ { metric: 'render', bins: [ 0.01, 0.1, 1, 10, 'inf'] } ]
                    * histogram for all timers except 'foo' related,
                      equal class interval and catchall for outliers:
                     [ { metric: 'foo', bins: [] },
                       { metric: '', bins: [ 50, 100, 150, 200, 'inf'] } ]
*/
{
  graphitePort: 2003
, graphiteHost: "graphite.host.com"
, port: 8125
, backends: [ "./backends/repeater" ]
, repeater: [ { host: "10.8.3.214", port: 8125 } ]
}
