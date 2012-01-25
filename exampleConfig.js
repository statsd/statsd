/*

Required Variables:

  port:             StatsD listening port [default: 8125]

Graphite Required Variables:

(Leave these unset to avoid sending stats to Graphite.
 Set debug flag and leave these unset to run in 'dry' debug mode -
 useful for testing statsd clients without a Graphite server.)

  graphiteHost:     hostname or IP of Graphite server
  graphitePort:     port of Graphite server

Librato Required Variables:

(Leave these unset to avoid sending stats to Librato.)
  libratoUser:      email/user ID for a Metrics account
  libratoApiKey:    API key associated with account

Librato Optional Variables:

  libratoSource:    provide a name for this data collection source
  libratoSnap:      snap timestamp to intervals of this many seconds to make graphs
                    stack better [s, default: 10]

Optional Variables:

  debug:            debug flag [default: false]
  debugInterval:    interval to print debug information [ms, default: 10000]
  dumpMessages:     log all incoming messages
  flushInterval:    interval (in ms) to flush to Graphite or Librato
  percentThreshold: for time information, calculate the Nth percentile
                      [%, default: 90]
  batch:            split up large updates to Graphite/Librato into batches
                      of size N [default: 200]
*/

{
    port: 8125
  , graphitePort: 2003
  , graphiteHost: "graphite.host.com"
//, libratoUser: "<librato email>"
//, libratoApiKey: "<librato api key>"
//, libratoSource: "loadbalancer-statsd" // optional source
//, libratoSnap: 10 // snap measurements to this interval
//, debug: 1
//, debugInterval: 10000
//, dumpMessages: 1
//, mgmt_port: 8126
//, flushInterval: 10000
//, percentThreshold: 90
//, batch: 200
}
