# Supported Backends

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
  metrics to stdout (see what's going on during development).
* Repeater (`repeater`): Utilizes the `packet` emit API to
  forward raw packets retrieved by StatsD to multiple backend StatsD instances.

By default, the `graphite` backend will be loaded automatically. Multiple
backends can be run at once. To select which backends are loaded, set
the `backends` configuration variable to the list of backend modules to load.

Backends are just npm modules which implement the interface described in
section [Backend Interface](./backend_interface.md). In order to be able to load the backend, add the
module name into the `backends` variable in your config. As the name is also
used in the `require` directive, you can load one of the provided backends by
giving the relative path (e.g. `./backends/graphite`).

A robust set of are also available as plugins to allow easy reporting into databases,
queues and third-party services.

## Available third-party backends

* [amqp-backend](https://github.com/mrtazz/statsd-amqp-backend)
* [atsd-backend](https://github.com/axibase/atsd-statsd-backend)
* [aws-cloudwatch-backend](https://github.com/camitz/aws-cloudwatch-statsd-backend)
* [node-bell](https://github.com/eleme/node-bell)
* [coralogix-backend](https://github.com/coralogix/statsd-coralogix-backend)
* [couchdb-backend](https://github.com/sysadminmike/couch-statsd-backend)
* [datadog-backend](https://github.com/DataDog/statsd-datadog-backend)
* elasticsearch-backend
  * [Elasticsearch 5 and 6](https://github.com/markkimsal/statsd-elasticsearch-backend)
  * [Elasticsearch 7](https://github.com/lorenzoaiello/statsd-elasticsearch7-backend)
* [ganglia-backend](https://github.com/jbuchbinder/statsd-ganglia-backend)
* [hosted graphite backend](https://github.com/hostedgraphite/statsdplugin)
* [influxdb backend](https://github.com/bernd/statsd-influxdb-backend)
* [instrumental backend](https://github.com/collectiveidea/statsd-instrumental-backend)
* [jut-backend](https://github.com/jut-io/statsd-jut-backend)
* [leftronic backend](https://github.com/sreuter/statsd-leftronic-backend)
* [librato-backend](https://github.com/librato/statsd-librato-backend)
* [mongo-backend](https://github.com/dynmeth/mongo-statsd-backend)
* [monitis backend](https://github.com/jeremiahshirk/statsd-monitis-backend)
* [mysql backend](https://github.com/fradinni/nodejs-statsd-mysql-backend)
* [netuitive backend](https://github.com/Netuitive/statsd-netuitive-backend)
* [opencensus-backend](https://github.com/DazWilkin/statsd-opencensus-backend)
* [opentsdb backend](https://github.com/emurphy/statsd-opentsdb-backend)
* [redistimeseries backend](https://github.com/hashedin/statsd-redistimeseries-backend)
* [socket.io-backend](https://github.com/Chatham/statsd-socket.io)
* [stackdriver backend](https://github.com/Stackdriver/stackdriver-statsd-backend)
* [statsd-backend](https://github.com/dynmeth/statsd-backend)
* [statsd http backend](https://github.com/bmhatfield/statsd-http-backend)
* [statsd aggregation backend](https://github.com/wanelo/gossip_girl)
* [warp10-backend](https://github.com/cityzendata/statsd-warp10-backend)
* [zabbix-backend](https://github.com/parkerd/statsd-zabbix-backend)

[graphite]: https://graphite.readthedocs.io/en/latest/
