{
  graphitePort: 2003
, graphiteHost: "graphite.host.com"
, port: 8125
, statusPort: 8126
, statusAddr: "0.0.0.0"
, flushBuckets: [
    {
      pattern: "^.*"
    , flushInterval: 10000
    , statPrefix: "stats"
    }
  ]
}