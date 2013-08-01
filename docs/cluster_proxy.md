Statsd Cluster Proxy
==============

Statsd Cluster Proxy is a udp proxy that sits infront of multiple statsd instances.


Create a proxyConfig.js file
  cp exampleProxyConfig.js proxyConfig.js

Once you have a config file run:
  node proxy.js proxyConfig.js


It uses a consistent hashring to send the unique metric names to the same statsd instances so that
the aggregation works properly.

It handles a simple health check that dynamically recalculates the hashring if a statsd instance goes offline.

Config Options
------

nodes         the array of node objects
  host        the ip of the statsd instance
  port        port of the statsd receiver
  adminport   port of the admin interface for this instance

udp_version   the string 'udp4' or udp6'

host          the host ip to listen on
port          the port the proxy listens on

checkInterval the interval between healthchecks
checkThreshold the number of healthcheck failures before a node is removed
