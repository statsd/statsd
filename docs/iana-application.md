### Transport protocols
- [x] TCP
- [x] UDP
- [ ] SCTP
- [ ] DCCP

### Service Name
StatsD

### Desired Port Number
8125

### Description
Network daemon for collecting metrics and publishing to various metric aggregation systems or services.

### Reference
StatsD is used to collect statistics such as counters and timers to measure system and application performance. StatsD receives metrics over UDP or TCP in a basic line protocl of the following format:

`<metricname>:<value>|<type>`

The metric name (or "bucket") is an identifier for the metric being sent. Values represent the metric value being pushed to StatsD and should be of the specified "type". StatsD supports numerous mertric types such as counters, gagues, and timers. Each has its own single character "short code" key which is used in the type section.

Metrics are collected and flushed at a desired interval to the plugable backend for storage and analysis.

Other projects and organisations have also created extensions to the StatsD protocol, one popular example being DogStatsD by DataDog. See https://docs.datadoghq.com/developers/dogstatsd/ for more details on the extension.

### If UDP is requested, please explain how traffic is limited, and whether the protocol reacts to congestion.
StatsD does not react to congestion itself, but does provide the means for creating StatsD clusters to aid performance.

### If UDP is requested, please indicate whether the service is solely for the discovery of hosts supporting this protocol.
StatsD is not intended for service discovery.

### Please explain how your protocol supports versioning.
As new metric types are introduced they will be assigned their own "short code". StatsD is intended to be run internally and not exposed to the wider world and so ensuring the StatsD version supports the desired metric type is the responsibility of the administrator.

### If your request is for more than one transport, please explain in detail how the protocol differs over each transport.
StatsD defaults to UDP but can be configured to use TCP to ensure delivery of packets. The protocol's contracts across TCP is the same as across UDP.

### Please describe how your protocol supports security. Note that new services are expected to support security capabilities and to avoid insecure variants.
It is recommended to run StatsD on the localhost / local infrastructure and to never be exposed to the wider internet. In the event that a user does wish to expose it, StatsD can be run behind authentication services which can be errected to proxy traffic through to StatsD if users wish to expose it across public networks such as the internet.

The primary StatsD server implementation maintains support for all current and LTS versions of nodejs. The protocol itself is small enough to enable the addition of authentication tokens should it fit the use case in the future via purely additive means.

### Please explain why a unique port assignment is necessary as opposed to a port in range (49152-65535) or existing port.
StatsD is an industry standard application used by many to aid in the development and monitoring of running applications. StatsD's popularity has lead to many guides and users making use of the default port 8125. Assignment of a unique port will enable operating system providers to reserve the port for StatsD usage to help safe guard against other services conflicting with the StatsD configuration and attempting to bind to the port, and potentially interrupting critical metric collection.

### Please explain the state of development of your protocol.
The StatsD network protocol has been stable for a decade and used by many application developers. The protocol is only expected to be added to in the future, not broken or changed in a way that would not support backwards compatibility.

### Please provide any other information that would be helpful in understanding how this protocol differs from existing assigned services.
The project has existed for around 9 years and has emerged as popular part of server side web application developer toolchains. Many other open source services make use of StatsD and assume its presence in an application monitoring stack, such as Graphite and Prometheus. StatsD is an open source project, it's documentation implementation can be found at https://github.com/statsd/statsd.

The StatsD protocol has many different implementations both on the client and server side, some popular examples include:
* JustEat's StatsD client implementation with over 326,000 downloads https://www.nuget.org/packages/JustEat.StatsD
* A popular GoLang "DogStatsD" client implementation https://github.com/statsd/datadog