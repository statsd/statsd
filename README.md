StatsD [![Build Status](https://secure.travis-ci.org/etsy/statsd.png)](http://travis-ci.org/etsy/statsd)
======

A network daemon that runs on the [Node.js][node] platform and
listens for statistics, like counters and timers, sent over [UDP][udp]
and sends aggregates to one or more pluggable backend services (e.g.,
[Graphite][graphite]).

We ([Etsy][etsy]) [blogged][blog post] about how it works and why we created it.


Concepts
--------

* *buckets*
  Each stat is in its own "bucket". They are not predefined anywhere. Buckets can be named anything that will translate to Graphite (periods make folders, etc)

* *values*
  Each stat will have a value. How it is interpreted depends on modifiers

* *flush*
  After the flush interval timeout (default 10 seconds), stats are
  aggregated and sent to an upstream backend service.

Counting
--------

    gorets:1|c

This is a simple counter. Add 1 to the "gorets" bucket. It stays in memory until the flush interval `config.flushInterval`.


Timing
------

    glork:320|ms

The glork took 320ms to complete this time. StatsD figures out 90th percentile, average (mean), lower and upper bounds for the flush interval.  The percentile threshold can be tweaked with `config.percentThreshold`.

The percentile threshold can be a single value, or a list of values, and will generate the following list of stats for each threshold:

    stats.timers.$KEY.mean_$PCT
    stats.timers.$KEY.upper_$PCT

Where `$KEY` is the key you stats key you specify when sending to statsd, and `$PCT` is the percentile threshold.

Sampling
--------

    gorets:1|c|@0.1

Tells StatsD that this counter is being sent sampled every 1/10th of the time.

Gauges
------
StatsD now also supports gauges, arbitrary values, which can be recorded.

    gaugor:333|g

Debugging
---------

There are additional config variables available for debugging:

* `debug` - log exceptions and periodically print out information on counters and timers
* `debugInterval` - interval for printing out information on counters and timers
* `dumpMessages` - print debug info on incoming messages

For more information, check the `exampleConfig.js`.

Supported Backends
------------------

StatsD supports multiple, pluggable, backend modules that can publish
statistics from the local StatsD daemon to a backend service or data
store. Backend services can retain statistics for
longer durations in a time series data store, visualize statistics in
graphs or tables, or generate alerts based on defined thresholds. A
backend can also correlate statistics sent from StatsD daemons running
across multiple hosts in an infrastructure.

StatsD includes the following backends:

* [Graphite][graphite] (`graphite`): Graphite is an open-source
  time-series data store that provides visualization through a
  web-browser interface.
* Console (`console`): The console backend outputs the received
  metrics to stdout (e.g. for seeing what's going on during development).

By default, the `graphite` backend will be loaded automatically. To
select which backends are loaded, set the `backends` configuration
variable to the list of backend modules to load.

Backends are just npm modules which implement the interface described in
section *Backend Interface*. In order to be able to load the backend, add the
module name into the `backends` variable in your config. As the name is also
used in the `require` directive, you can load one of the provided backends by
giving the relative path (e.g. `./backends/graphite`).

Graphite Schema
---------------

Graphite uses "schemas" to define the different round robin datasets it houses (analogous to RRAs in rrdtool). Here's what Etsy is using for the stats databases:

    [stats]
    priority = 110
    pattern = ^stats\..*
    retentions = 10:2160,60:10080,600:262974

That translates to:

* 6 hours of 10 second data (what we consider "near-realtime")
* 1 week of 1 minute data
* 5 years of 10 minute data

This has been a good tradeoff so far between size-of-file (round robin databases are fixed size) and data we care about. Each "stats" database is about 3.2 megs with these retentions.

TCP Stats Interface
-------------------

A really simple TCP management interface is available by default on port 8126 or overriden in the configuration file. Inspired by the memcache stats approach this can be used to monitor a live statsd server.  You can interact with the management server by telnetting to port 8126, the following commands are available:

* stats - some stats about the running server
* counters - a dump of all the current counters
* timers - a dump of the current timers

The stats output currently will give you:

* uptime: the number of seconds elapsed since statsd started
* messages.last_msg_seen: the number of elapsed seconds since statsd received a message
* messages.bad_lines_seen: the number of bad lines seen since startup

Each backend will also publish a set of statistics, prefixed by its
module name.

Graphite:

* graphite.last_flush: the number of seconds elapsed since the last successful flush to graphite
* graphite.last_exception: the number of seconds elapsed since the last exception thrown whilst flushing to graphite

A simple nagios check can be found in the utils/ directory that can be used to check metric thresholds, for example the number of seconds since the last successful flush to graphite.

Installation and Configuration
------------------------------

 * Install node.js
 * Clone the project
 * Create a config file from exampleConfig.js and put it somewhere
 * Start the Daemon:

    node stats.js /path/to/config

Tests
-----

A test framework has been added using node-unit and some custom code to start and manipulate statsd. Please add tests under test/ for any new features or bug fixes encountered. Testing a live server can be tricky, attempts were made to eliminate race conditions but it may be possible to encounter a stuck state. If doing dev work, a `killall node` will kill any stray test servers in the background (don't do this on a production machine!).

Tests can be executd with `./run_tests.sh`.

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
    pctThreshold: pctThreshold
}
  ```

  Each backend module is passed the same set of statistics, so a
  backend module should treat the metrics as immutable
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

Inspiration
-----------

StatsD was inspired (heavily) by the project (of the same name) at Flickr. Here's a post where Cal Henderson described it in depth:
[Counting and timing](http://code.flickr.com/blog/2008/10/27/counting-timing/). Cal re-released the code recently: [Perl StatsD](https://github.com/iamcal/Flickr-StatsD)


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
http://github.com/etsy/statsd/commits/master
