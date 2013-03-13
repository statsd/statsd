Metric namespacing
-------------------
The metric namespacing in the Graphite backend is configurable with regard to
the prefixes. Per default all stats are put under `stats` in Graphite, which
makes it easier to consolidate them all under one schema. However it is
possible to change these namespaces in the backend configuration options.
The available configuration options (living under the `graphite` key) are:

```
legacyNamespace:  use the legacy namespace [default: true]
globalPrefix:     global prefix to use for sending stats to graphite [default: "stats"]
prefixCounter:    graphite prefix for counter metrics [default: "counters"]
prefixTimer:      graphite prefix for timer metrics [default: "timers"]
prefixGauge:      graphite prefix for gauge metrics [default: "gauges"]
prefixSet:        graphite prefix for set metrics [default: "sets"]
```

If you decide not to use the legacy namespacing, besides the obvious changes
in the prefixing, there will also be a breaking change in the way counters are
submitted. So far counters didn't live under any namespace and were also a bit
confusing due to the way they record rate and absolute counts. In the legacy
setting rates were recorded under `stats.counter_name` directly, whereas the
absolute count could be found under `stats_counts.counter_name`. When legacy namespacing
is disabled those values can be found (with default prefixing)
under `stats.counters.counter_name.rate` and
`stats.counters.counter_name.count` now.

The number of elements in sets will be recorded under the metric
`stats.sets.set_name.count` (where "sets" is the prefixSet).

