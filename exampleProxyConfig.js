/*

Required Variables:

  port:             StatsD Cluster Proxy listening port [default: 8125]
  nodes:            list of StatsD instances
     host:          address of an instance of StatsD
     port:          port that this instance is listening on
     adminport:     port that this instance is listening on for the admininterface

Optional Variables:

  udp_version:      defines if the address is an IPv4 or IPv6 address ['udp4' or 'udp6', default: 'udp4']
  host:             address to listen on over UDP [default: 0.0.0.0]
  checkInterval:    health status check interval [default: 10000]
  cacheSize:        size of the cache to store for hashring key lookups [default: 10000]
  forkCount:        number of child processes (cluster module), number or 'auto' for utilize all cpus [default:0]

*/
{
nodes: [
{host: '127.0.0.1', port: 8127, adminport: 8128},
{host: '127.0.0.1', port: 8129, adminport: 8130},
{host: '127.0.0.1', port: 8131, adminport: 8132}
],
udp_version: 'udp4',
host:  '0.0.0.0',
port: 8125,
forkCount: 0,
checkInterval: 1000,
cacheSize: 10000
}
