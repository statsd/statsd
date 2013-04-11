TCP Stats Interface
-------------------

A really simple TCP management interface is available by default on port 8126
or overriden in the configuration file. Inspired by the memcache stats approach
this can be used to monitor a live statsd server.  You can interact with the
management server by telnetting to port 8126, the following commands are
available:

* stats - some stats about the running server
* counters - a dump of all the current counters
* gauges - a dump of all the current gauges
* timers - a dump of the current timers
* delcounters - delete a counter or folder of counters
* delgauges - delete a gauge or folder of gauges 
* deltimers - delete a timer or folder of timers
* health - a way to set the health status of statsd

The stats output currently will give you:

* uptime: the number of seconds elapsed since statsd started
* messages.last_msg_seen: the number of elapsed seconds since statsd received a message
* messages.bad_lines_seen: the number of bad lines seen since startup

You can use the del commands to delete an individual metric like this :

    #to delete counter sandbox.test.temporary
    echo "delcounters sandbox.test.temporary" | nc 127.0.0.1 8126

Or you can use the del command to delete a folder of metrics like this :

    #to delete counters sandbox.test.*
    echo "delcounters sandbox.test.*" | nc 127.0.0.1 8126
    

Each backend will also publish a set of statistics, prefixed by its module name.

Graphite:

* graphite.last_flush: unix timestamp of last successful flush to graphite
* graphite.last_exception: unix timestamp of last exception thrown whilst flushing to graphite
* graphite.flush_length: the length of the string sent to graphite
* graphite.flush_time: the time it took to send the data to graphite

Those statistics will also be sent to graphite under the namespaces
`stats.statsd.graphiteStats.last_exception` and
`stats.statsd.graphiteStats.last_flush`.

A simple nagios check can be found in the utils/ directory that can be used to
check metric thresholds, for example the number of seconds since the last
successful flush to graphite.

The health output:
* the health command alone allows you to see the current health status.
* using health up or health down, you can change the current health status.
* the healthStatus configuration option allows you to set the default health status at start.

