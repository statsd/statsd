StatsD [![Build Status](https://travis-ci.org/etsy/statsd.png?branch=backends-as-packages)](https://travis-ci.org/etsy/statsd)
======

A network daemon that runs on the [Node.js][node] platform and
listens for statistics, like counters and timers, sent over [UDP][udp]
and sends aggregates to one or more pluggable backend services (e.g.,
[Graphite][graphite]).

We ([Etsy][etsy]) [blogged][blog post] about how it works and why we created it.


Concepts
--------

* *buckets*
  Each stat is in its own "bucket". They are not predefined anywhere. Buckets
can be named anything that will translate to Graphite (periods make folders,
etc)

* *values*
  Each stat will have a value. How it is interpreted depends on modifiers. In
general values should be integer.

* *flush*
  After the flush interval timeout (defined by `config.flushInterval`,
  default 10 seconds), stats are aggregated and sent to an upstream backend service.

Counting
--------

    gorets:1|c

This is a simple counter. Add 1 to the "gorets" bucket.
At each flush the current count is sent and reset to 0.
If the count at flush is 0 then you can opt to send no metric at all for
this counter, by setting `config.deleteCounters` (applies only to graphite
backend).  Statsd will send both the rate as well as the count at each flush.

### Sampling

    gorets:1|c|@0.1

Tells StatsD that this counter is being sent sampled every 1/10th of the time.

Timing
------

    glork:320|ms

The glork took 320ms to complete this time. StatsD figures out percentiles,
average (mean), standard deviation, sum, lower and upper bounds for the flush interval.
The percentile threshold can be tweaked with `config.percentThreshold`.

The percentile threshold can be a single value, or a list of values, and will
generate the following list of stats for each threshold:

    stats.timers.$KEY.mean_$PCT
    stats.timers.$KEY.upper_$PCT
    stats.timers.$KEY.sum_$PCT

Where `$KEY` is the stats key you specify when sending to statsd, and `$PCT` is
the percentile threshold.

Use the `config.histogram` setting to instruct statsd to maintain histograms
over time.  Specify which metrics to match and a corresponding list of
ordered non-inclusive upper limits of bins (class intervals).
(use `inf` to denote infinity; a lower limit of 0 is assumed)
Each `flushInterval`, statsd will store how many values (absolute frequency)
fall within each bin (class interval), for all matching metrics.
Examples:

* no histograms for any timer (default): `[]`
* histogram to only track render durations,
  with unequal class intervals and catchall for outliers:

        [ { metric: 'render', bins: [ 0.01, 0.1, 1, 10, 'inf'] } ]

* histogram for all timers except 'foo' related,
  with equal class interval and catchall for outliers:

        [ { metric: 'foo', bins: [] },
          { metric: '', bins: [ 50, 100, 150, 200, 'inf'] } ]

Note:

* first match for a metric wins.
* bin upper limits may contain decimals.
* this is actually more powerful than what's strictly considered
histograms, as you can make each bin arbitrarily wide,
i.e. class intervals of different sizes.

Gauges
------
StatsD now also supports gauges, arbitrary values, which can be recorded.

    gaugor:333|g

Adding a sign to the gauge value will change the value, rather than setting it.

    gaugor:-10|g
    gaugor:+4|g

So if `gaugor` was `333`, those commands would set it to `333 - 10 + 4`, or
`327`.

Note:

This implies you can't explicitly set a gauge to a negative number
without first setting it to zero.

Sets
----
StatsD supports counting unique occurences of events between flushes,
using a Set to store all occuring events.

    uniques:765|s

Multi-Metric Packets
--------------------
StatsD supports receiving multiple metrics in a single packet by separating them
with a newline.

    gorets:1|c\nglork:320|ms\ngaugor:333|g\nuniques:765|s

Be careful to keep the total length of the payload within your network's MTU. There
is no single good value to use, but here are some guidelines for common network
scenarios:

* Fast Ethernet (1432) - This is most likely for Intranets.
* Gigabit Ethernet (8932) - Jumbo frames can make use of this feature much more
  efficient.
* Commodity Internet (512) - If you are routing over the internet a value in this
  range will be reasonable. You might be able to go higher, but you are at the mercy
  of all the hops in your route.

*(These payload numbers take into account the maximum IP + UDP header sizes)*

Debugging
---------

There are additional config variables available for debugging:

* `debug` - log exceptions and print out more diagnostic info
* `dumpMessages` - print debug info on incoming messages

For more information, check the `exampleConfig.js`.

Supported Backends
------------------

StatsD supports pluggable backend modules that can publish
statistics from the local StatsD daemon to a backend service or data
store. Backend services can retain statistics in a time series data store,
visualize statistics in graphs or tables, or generate alerts based on
defined thresholds. A backend can also correlate statistics sent from StatsD
daemons running across multiple hosts in an infrastructure.

StatsD includes the following built-in backends:

* [Graphite][graphite] (`graphite`): An open-source
  time-series data store that provides visualization through a web-browser.
* Console (`console`): Outputs the received
  metrics to stdout (see what's going on during development or debugging).
* Repeater (`repeater`): Utilizes the `packet` emit API to
  forward raw packets retrieved by StatsD to multiple backend StatsD instances.

A robust set of [other backends](https://github.com/etsy/statsd/wiki/Backends)
are also available as plugins to allow easy reporting into databases, queues
and third-party services.

By default, the `graphite` backend will be loaded automatically. Multiple
backends can be run at once. To select which backends are loaded, set
the `backends` configuration variable to the list of backend modules to load.

Backends are just npm modules which implement the interface described in
section *Backend Interface*. In order to be able to load the backend, add the
module name into the `backends` variable in your config. As the name is also
used in the `require` directive, you can load one of the provided backends by
giving the relative path (e.g. `./backends/graphite`).

Graphite Schema
---------------

Graphite uses "schemas" to define the different round robin datasets it houses
(analogous to RRAs in rrdtool). Here's an example for the stats databases:

In conf/storage-schemas.conf:

    [stats]
    pattern = ^stats.*
    retentions = 10:2160,60:10080,600:262974

In conf/storage-aggregation.conf:

    [min]
    pattern = \.min$
    xFilesFactor = 0.1
    aggregationMethod = min

    [max]
    pattern = \.max$
    xFilesFactor = 0.1
    aggregationMethod = max

    [sum]
    pattern = \.count$
    xFilesFactor = 0
    aggregationMethod = sum

    [default_average]
    pattern = .*
    xFilesFactor = 0.3
    aggregationMethod = average

This translates to:

* 6 hours of 10 second data (what we consider "near-realtime")
* 1 week of 1 minute data
* 5 years of 10 minute data
* For databases with 'min' or 'max' in the name, keep only the minimum and
  maximum value when rolling up data and store a None if less than 10% of the
  datapoints were received
* For databases with 'count' in the name, add all the values together, and
  store only a None if none of the datapoints were received
* For all other databases, average the values (mean) when rolling up data, and
  store a None if less than 30% of the datapoints were received

(Note: Newer versions of Graphite can take human readable time formats like
10s:6h,1min:7d,10min:5y)

Retentions and aggregations are read from the file in order, the first pattern
that matches is used.  This is set when the database is first created, changing
these config files will not change databases that have already been created.
To view or alter the settings on existing files, use whisper-info.py and
whisper-resize.py included with the Whisper package.

These settings have been a good tradeoff so far between size-of-file (round
robin databases are fixed size) and data we care about. Each "stats" database
is about 3.2 megs with these retentions.

Many users have been confused to see their hit counts averaged, missing when
the data is intermittent, or never stored when statsd is sending at a different
interval than graphite expects.  Storage aggregation settings will help you
control this and understand what Graphite is doing internally with your data.

TCP Stats Interface
-------------------

A really simple TCP management interface is available by default on port 8126
or overriden in the configuration file. Inspired by the memcache stats approach
this can be used to monitor a live statsd server.  You can interact with the
management server by telnetting to port 8126, the following commands are
available:

* stats - some stats about the running server
* counters - a dump of all the current counters
* timers - a dump of the current timers

The stats output currently will give you:

* uptime: the number of seconds elapsed since statsd started
* messages.last_msg_seen: the number of elapsed seconds since statsd received a
  message
* messages.bad_lines_seen: the number of bad lines seen since startup

Each backend will also publish a set of statistics, prefixed by its
module name.

You can use this to delete buckets no longer in use. For example, if you were hosting statsd at 10.10.10.10:

    #to delete counter sandbox.test.temporary
    echo "delcounters sandbox.test.temporary" | nc 10.10.10.10 8126

Graphite:

* graphite.last_flush: the number of seconds elapsed since the last successful
  flush to graphite
* graphite.last_exception: the number of seconds elapsed since the last
  exception thrown whilst flushing to graphite
* graphite.flush_length: the length of the string sent to graphite
* graphite.flush_time: the time it took to send the data to graphite

Those statistics will also be sent to graphite under the namespaces
`stats.statsd.graphiteStats.last_exception` and
`stats.statsd.graphiteStats.last_flush`.

A simple nagios check can be found in the utils/ directory that can be used to
check metric thresholds, for example the number of seconds since the last
successful flush to graphite.

Installation and Configuration
------------------------------

 * Install node.js
 * Clone the project
 * Create a config file from exampleConfig.js and put it somewhere
 * Start the Daemon:

    node stats.js /path/to/config

Tests
-----

A test framework has been added using node-unit and some custom code to start
and manipulate statsd. Please add tests under test/ for any new features or bug
fixes encountered. Testing a live server can be tricky, attempts were made to
eliminate race conditions but it may be possible to encounter a stuck state. If
doing dev work, a `killall node` will kill any stray test servers in the
background (don't do this on a production machine!).

Tests can be executed with `./run_tests.sh`.

Backend Interface
-----------------

Backend modules are Node.js [modules][nodemods] that listen for a
number of events emitted from StatsD. Each backend module should
export the following initialization function:

* `init(startup_time, config, events)`: This method is invoked from StatsD to
  initialize the backend module. It accepts three parameters:
  `startup_time` is the startup time of StatsD in epoch seconds,
  `config` is the parsed config file hash, and `events` is the event
  emitter that backends can use to listen for events.

  The backend module should return `true` from init() to indicate
  success. A return of `false` indicates a failure to load the module
  (missing configuration?) and will cause StatsD to exit.

Backends can listen for the following events emitted by StatsD from
the `events` object:

* Event: **'flush'**

  Parameters: `(time_stamp, metrics)`

  Emitted on each flush interval so that backends can push aggregate
  metrics to their respective backend services. The event is passed
  two parameters: `time_stamp` is the current time in epoch seconds
  and `metrics` is a hash representing the StatsD statistics:

  ```
metrics: {
    counters: counters,
    gauges: gauges,
    timers: timers,
    sets: sets,
    counter_rates: counter_rates,
    timer_data: timer_data,
    statsd_metrics: statsd_metrics,
    pctThreshold: pctThreshold
}
  ```

  The counter_rates and timer_data are precalculated statistics to simplify
  the creation of backends, the statsd_metrics hash contains metrics generated
  by statsd itself. Each backend module is passed the same set of
  statistics, so a backend module should treat the metrics as immutable
  structures. StatsD will reset timers and counters after each
  listener has handled the event.

* Event: **'status'**

  Parameters: `(writeCb)`

  Emitted when a user invokes a *stats* command on the management
  server port. It allows each backend module to dump backend-specific
  status statistics to the management port.

  The `writeCb` callback function has a signature of `f(error,
  backend_name, stat_name, stat_value)`. The backend module should
  invoke this method with each stat_name and stat_value that should be
  sent to the management port. StatsD will prefix each stat name with
  the `backend_name`. The backend should set `error` to *null*, or, in
  the case of a failure, an appropriate error.

* Event: **'packet'**

  Parameters: `(packet, rinfo)`

  This is emitted for every incoming packet. The `packet` parameter contains
  the raw received message string and the `rinfo` paramter contains remote
  address information from the UDP socket.


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

Inspiration
-----------

StatsD was inspired (heavily) by the project (of the same name) at Flickr.
Here's a post where Cal Henderson described it in depth:
[Counting and timing](http://code.flickr.com/blog/2008/10/27/counting-timing/).
Cal re-released the code recently:
[Perl StatsD](https://github.com/iamcal/Flickr-StatsD)

Meta
---------
- IRC channel: `#statsd` on freenode
- Mailing list: `statsd@librelist.com`


Contribute
---------------------

You're interested in contributing to StatsD? *AWESOME*. Here are the basic steps:

fork StatsD from here: http://github.com/etsy/statsd

1. Clone your fork
2. Hack away
3. If you are adding new functionality, document it in the README
4. If necessary, rebase your commits into logical chunks, without errors
5. Push the branch up to GitHub
6. Send a pull request to the etsy/statsd project.

We'll do our best to get your changes in!


[graphite]: http://graphite.wikidot.com
[etsy]: http://www.etsy.com
[blog post]: http://codeascraft.etsy.com/2011/02/15/measure-anything-measure-everything/
[node]: http://nodejs.org
[nodemods]: http://nodejs.org/api/modules.html
[udp]: http://en.wikipedia.org/wiki/User_Datagram_Protocol


Contributors
-----------------

In lieu of a list of contributors, check out the commit history for the project:
https://github.com/etsy/statsd/graphs/contributors
