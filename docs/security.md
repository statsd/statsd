# Security

Although **statsd** would be preferably configured to listen for UDP datagrams
on local IP address (*loopback*), it is sometime usefull to bind listening
socket to *any* address in order to be able to receive metrics sent from
other machine. In this case, there might be a possible security issue allowing
some unwanted client to send metrics to statsd (altering regular metrics or
flooding the system).

One could setup firewall rules (*iptables*, *firewalld*, ...) to solve this
problem, but it is also possible to add some basic filtering rules inside
**statsd** to discard unwanted client by specifying some *blacklisted* IP
sources.

### Configuration

The available configuration options (living under the *fromOnly* key) are:

    family:     restrict by IP family ['ipv4' or 'ipv6', default: undefined]
    addresses:  array of allowed client IP addresses or range (with .../bits syntax) [default: undefined]

* The `config.fromOnly.family` can be used to allow only clients of a given IP
  family address. the *ipv4* and *ipv6* keywords are supported. Do not specify
  this parameter if you do not want to filter based on family types.
* The `config.fromOnly.adresses` can be used to restrict client machines by
  their IP adress. You can specify and array of strings representing those
  adresses. An address is either a plain address (ipv4 or ipv6) or a subnet by
  suffixing the adress with */bits* representing the number of bits of the mask.
  If this parameter in not specified, then no filtering is done based on source
  IP address.
  
#### Example:

    onlyFrom : {
      family : "ipv4",
      addresses : [ "127.0.0.1", "192.168.0.0/16" ]
    }

---

_Note_: If a datagram matches the specified filtering rule, it is silently dropped and even no log record is generated (in case of flooding attack).

