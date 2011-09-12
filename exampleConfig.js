{
  graphitePort: 2003
, graphiteHost: "graphite.host.com"
, port: 8125
, flushBuckets: [
    {
      pattern: "^.*"
    , flushInterval: 10000
    , statPrefix: "stats"
    }
  ]
}