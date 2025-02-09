# StatsD [![Join the chat at https://gitter.im/statsd/statsd](https://badges.gitter.im/statsd/statsd.svg)](https://gitter.im/statsd/statsd?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge) [![Docker Pulls](https://img.shields.io/docker/pulls/statsd/statsd)](https://hub.docker.com/r/statsd/statsd)

A network daemon that runs on the [Node.js][node] platform and
listens for statistics, like counters and timers, sent over [UDP][udp] or
[TCP][tcp] and sends aggregates to one or more pluggable backend services (e.g.,
[Graphite][graphite]).

## Key Concepts

* *buckets*

  Each stat is in its own "bucket". They are not predefined anywhere. Buckets
can be named anything that will translate to Graphite (periods make folders,
etc)

* *values*

  Each stat will have a value. How it is interpreted depends on modifiers. In
general values should be integers.

* *flush*

  After the flush interval timeout (defined by `config.flushInterval`,
  default 10 seconds), stats are aggregated and sent to an upstream backend service.


## Installation and Configuration

### Docker
StatsD supports docker in three ways:
* The official container image on [GitHub Container Registry](https://github.com/statsd/statsd/pkgs/container/statsd)
* The official container image on [DockerHub](https://hub.docker.com/r/statsd/statsd)
* Building the image from the bundled [Dockerfile](./Dockerfile)

To configure the statsd container, create a `config.js` file (you can refer to `exampleConfig.js` for guidance),
and then add the volume to the container as follows:
```
docker run statsd/statsd -v /path/to/config.js:/usr/src/app/config.js
```

### Manual installation
 * Install Node.js (All [`Current` and `LTS` Node.js versions](https://nodejs.org/en/about/releases/) are supported.)
 * Clone the project
 * Create a config file from `exampleConfig.js` and put it somewhere
 * Start the Daemon:
   `node stats.js /path/to/config`

## Usage
The basic line protocol expects metrics to be sent in the format:

    <metricname>:<value>|<type>

So the simplest way to send in metrics from your command line if you have
StatsD running with the default UDP server on localhost would be:

    echo "foo:1|c" | nc -u -w0 127.0.0.1 8125

## More Specific Topics
* [Metric Types][docs_metric_types]
* [Graphite Integration][docs_graphite]
* [Supported Servers][docs_server]
* [Supported Backends][docs_backend]
* [Admin TCP Interface][docs_admin_interface]
* [Server Interface][docs_server_interface]
* [Backend Interface][docs_backend_interface]
* [Metric Namespacing][docs_namespacing]
* [StatsD Cluster Proxy][docs_cluster_proxy]

## Debugging
There are additional config variables available for debugging:

* `debug` - log exceptions and print out more diagnostic info
* `dumpMessages` - print debug info on incoming messages

For more information, check the `exampleConfig.js`.


## Tests
A test framework has been added using node-unit and some custom code to start
and manipulate StatsD. Please add tests under test/ for any new features or bug
fixes encountered. Testing a live server can be tricky, attempts were made to
eliminate race conditions but it may be possible to encounter a stuck state. If
doing dev work, a `killall statsd` will kill any stray test servers in the
background (don't do this on a production machine!).

Tests can be executed with `./run_tests.sh`.

## History
StatsD was originally written at [Etsy][etsy] and released with a
[blog post][blog post] about how it works and why we created it.

## Inspiration
StatsD was inspired (heavily) by the project of the same name at Flickr.
Here's a post where Cal Henderson described it in depth:
[Counting and timing][counting-timing].
Cal re-released the code recently:
[Perl StatsD][Flicker-StatsD]



[graphite]: http://graphite.readthedocs.org/
[etsy]: http://www.etsy.com
[blog post]: https://codeascraft.etsy.com/2011/02/15/measure-anything-measure-everything/
[node]: http://nodejs.org
[nodemods]: http://nodejs.org/api/modules.html
[counting-timing]: http://code.flickr.com/blog/2008/10/27/counting-timing/
[Flicker-StatsD]: https://github.com/iamcal/Flickr-StatsD
[udp]: http://en.wikipedia.org/wiki/User_Datagram_Protocol
[tcp]: http://en.wikipedia.org/wiki/Transmission_Control_Protocol
[docs_metric_types]: https://github.com/statsd/statsd/blob/master/docs/metric_types.md
[docs_graphite]: https://github.com/statsd/statsd/blob/master/docs/graphite.md
[docs_server]: https://github.com/statsd/statsd/blob/master/docs/server.md
[docs_backend]: https://github.com/statsd/statsd/blob/master/docs/backend.md
[docs_admin_interface]: https://github.com/statsd/statsd/blob/master/docs/admin_interface.md
[docs_server_interface]: https://github.com/statsd/statsd/blob/master/docs/server_interface.md
[docs_backend_interface]: https://github.com/statsd/statsd/blob/master/docs/backend_interface.md
[docs_namespacing]: https://github.com/etsy/statsd/blob/master/docs/namespacing.md
[docs_cluster_proxy]: https://github.com/etsy/statsd/blob/master/docs/cluster_proxy.md
[travis-ci_status_img]: https://travis-ci.org/statsd/statsd.svg?branch=master
[travis-ci_statsd]: https://travis-ci.org/statsd/statsd
