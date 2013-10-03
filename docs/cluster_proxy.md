Statsd Cluster Proxy
==============

Statsd Cluster Proxy is a udp proxy that sits infront of multiple statsd instances.


Create a proxyConfig.js file:

  `cp exampleProxyConfig.js proxyConfig.js`

Once you have modified your config file run:
  
  `node proxy.js proxyConfig.js`


It uses a consistent hashring to send the unique metric names to the same statsd instances so that
the aggregation works properly.

It handles a simple health check that dynamically recalculates the hashring if a statsd instance goes offline.

Config Options are documented in the [exampleProxyConfig.js][exampleProxyConfig.js]


[exampleProxyConfig.js]: https://github.com/etsy/statsd/blob/master/exampleProxyConfig.js
