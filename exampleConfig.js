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
  deleteCounters:   when flushing to graphite, send null instead of 0 [default: false]

  console:
    prettyprint:    whether to prettyprint the console backend
                    output [true or false, default: true]

  log:              log settings [object, default: undefined]
    backend:        where to log: stdout or syslog [string, default: stdout]
    application:    name of the application for syslog [string, default: statsd]
    level:          log level for [node-]syslog [string, default: LOG_INFO]

  graphite:
    legacyNamespace:  use the legacy namespace [default: true]
    globalPrefix:     global prefix to use for sending stats to graphite [default: "stats"]
    prefixCounter:    graphite prefix for counter metrics [default: "counters"]
    prefixTimer:      graphite prefix for timer metrics [default: "timers"]
    prefixGauge:      graphite prefix for gauge metrics [default: "gauges"]
    prefixSet:        graphite prefix for set metrics [default: "sets"]

  repeater:         an array of hashes of the for host: and port:
                    that details other statsd servers to which the received
                    packets should be "repeated" (duplicated to).
                    e.g. [ { host: '10.10.10.10', port: 8125 },
                           { host: 'observer', port: 88125 } ]

  repeaterProtocol: whether to use udp4 or udp4 for repeaters.
                    ["udp4" or "udp6", default: "udp4"]
*/
{
  graphitePort: 2003
, graphiteHost: "graphite.host.com"
, port: 8125
, backends: [ "./backends/graphite" ]
, repeater: [ { host: "10.8.3.214", port: 8125 } ]
, repeaterProtocol: "udp4"
}
