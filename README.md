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

This is a simple counter. Add 1 to the "gorets" bucket. It stays in memory until the flush interval.


Timing
------

    glork:320|ms

The glork took 320ms to complete this time. StatsD figures out 90th percentile, average (mean), lower and upper bounds for the flush interval.

Sampling
--------

    gorets:1|c|@0.1

Tells StatsD that this counter is being sent sampled every 1/10th of the time.


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
