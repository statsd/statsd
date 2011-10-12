StatsD
======

A network daemon for aggregating statistics (counters and timers), rolling them up, then sending them to [graphite][graphite].

We ([Etsy][etsy]) [blogged][blog post] about how it works and why we created it.


Concepts
--------

* *buckets*
  Each stat is in it's own "bucket". They are not predefined anywhere. Buckets can be named anything that will translate to Graphite (periods make folders, etc)

* *values*
  Each stat will have a value. How it is interpreted depends on modifiers

* *flush*
  After the flush interval timeout (default 10 seconds), stats are munged and sent over to Graphite.

Counting
--------

    gorets:1|c

This is a simple counter. Add 1 to the "gorets" bucket. It stays in memory until the flush interval `config.flushInterval`.


Timing
------

    glork:320|ms

The glork took 320ms to complete this time. StatsD figures out 90th percentile, average (mean), lower and upper bounds for the flush interval.  The percentile threshold can be tweaked with `config.percentThreshold`.

Sampling
--------

    gorets:1|c|@0.1

Tells StatsD that this counter is being sent sampled every 1/10th of the time.

Debugging
---------

There are additional config variables available for debugging:

* `debug` - log exceptions and periodically print out information on counters and timers
* `debugInterval` - interval for printing out information on counters and timers
* `dumpMessages` - print debug info on incoming messages

For more information, check the `exampleConfig.js`.

Guts
----

* [UDP][udp]
  Client libraries use UDP to send information to the StatsD daemon.

* [NodeJS][node]
* [Graphite][graphite]

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
* graphite.last_flush: the number of seconds elapsed since the last successful flush to graphite
* graphite.last_exception: the number of seconds elapsed since the last exception thrown whilst flushing to graphite
* messages.last_msg_seen: the number of elapsed seconds since statsd received a message
* messages.bad_lines_seen: the number of bad lines seen since startup

Installation and Configuration
------------------------------

 * Install node.js
 * Clone the project
 * Create a config file from exampleConfig.js and put it somewhere
 * Start the Daemon:

    node stats.js /path/to/config


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
[udp]: http://enwp.org/udp


Contributors
-----------------

In lieu of a list of contributors, check out the commit history for the project:
http://github.com/etsy/statsd/commits/master
