conndots/statsd
====
# v1.0
Modified from [etsy/statsd](https://github.com/etsy/statsd), you can group the nodes to be configured to different graphite backend storages. Configure the grouping strategies in conf/proxy_node_groups.js. It uses prefix matching to decide which group to send and use hashring to hash and leverage.  
Use proxy.js conf/proxy_node_groups.js 8127 8128 to start the proxy node. 8127 is the default port and 8128 is the mgnt port. 
