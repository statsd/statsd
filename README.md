StatsD
======

Sometimes you need to count stuff.
Maybe you need to know how long something took.


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

Tells StatsD that this counter is being sent sampled ever 1/10th of the time.


Guts
----

* UDP
  Client libraries use UDP to send information to the StatsD daemon.

* NodeJS
* Graphite

Inspiration
-----------

StatsD was inspired (heavily) by the project (of the same name) at Flickr. Here's a post where Cal Henderson described it in depth:
[Counting and timing](http://code.flickr.com/blog/2008/10/27/counting-timing/). Cal re-released the code recently: [Perl StatsD](https://github.com/iamcal/Flickr-StatsD)

