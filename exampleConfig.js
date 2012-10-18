/*

Required Variables:

  port:             StatsD listening port [default: 8125]

  backends:         an array of backends to load. Each backend must exist
                    by name in the directory backends/. If not specified,
                    the default graphite backend will be loaded.

Backend Required Variables:

 graphite :         an array of hashes of the host: and port:
                    that details the graphite servers to which StatsD
                    should send data to.
                    e.g. [ { host: '10.10.10.10', port: 2003 }]

 repeater:          an array of hashes of the host: and port:
                    that details other statsd servers to which the received
                    packets should be "repeated" (duplicated to).
                    e.g. [ { host: '10.10.10.10', port: 8125 },
                           { host: 'observer', port: 88125 } ]

Optional Variables:

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

  console:
    prettyprint:    whether to prettyprint the console backend
                    output [true or false, default: true]

  log:              log settings [object, default: undefined]
    backend:        where to log: stdout or syslog [string, default: stdout]
    application:    name of the application for syslog [string, default: statsd]
    level:          log level for [node-]syslog [string, default: LOG_INFO]

Sample :
{
  port: 8125
, backends: [ "./backends/graphite", "./backends/repeeater" ]
, repeater: [ { host: "10.8.3.214",        port: 8125 } ]
, graphite: [ { host: "graphite.host.com", port: 2003 } ]
}
*/
{
  port: 8125
}
