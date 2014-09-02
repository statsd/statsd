# Changelog

## v0.7.2 (09/02/2014)
- Fixes to detecting valid packets

## v0.7.1 (02/06/2014)
- move contributing information into CONTRIBUTING.md
- Updates winser to v0.1.6
- examples: python: added efficiency note
- python: examples: fixed doctests for Python 3
- Standardized debian log locations
- Enhancement: consume logger in graphite and repeater backends
- Enhancement: update backend documentation
- Enhancement: inject logger object into backend
- Send STDOUT and STDERR to the appropriate files

## v0.7.0 (12/05/2013)
- added cluster proxy
- measure and graph timestamp generation lag
- added median calculation for timers
- support for top percentiles for timers
- drop support for node v0.6.x
- support for setting the process title
- functionality for optionally omitting stats_counts metrics
- improved functionality to delete counters from the management console
- updates to Debian packaging
- added a clojure example client
- cleaned up the Go example client
- increased test coverage
- documentation updates

## v0.6.0 (03/15/2013)
- added new metric types : sets, gauge deltas, histograms
- added ability to delete idle stats
- added support for configurable namespacing
- added standard Deviation to timers stats (.std)
- added last_flush_time and last_flush_length metrics to graphite backend
- added ipv6 support
- added Statsd repeater backend
- added helper script to decide which timers to sample down
- added Windows service support
- added Scala example
- added support for sampling timers.
- added build testing on node 0.8, 0.9, and 0.10
- fixed broken config file watching.
- fixed for DNS errors from UDP socket
- fixed for TCP client goes away crash.
- removed debugInterval in favor of Console backend debugging
- updated and reorganized Docs
- updated examples scripts
- improved the quality of randomness used for sampling.
- moved  config.js to /lib folder to avoid confusion

## v0.5.0 (07/20/2012)
- add support for logging to syslog
- add basic metrics gathering for StatsD and Graphite backend itself
- several fixes and enhancements for the debian resources
- fixed locale bug in Java client.
- multiple fixes for the Java client

## v0.4.0 (06/29/2012)
- add bin/statsd
- Add CLI bash client example
- documentation updates
- bug fixing, sample_data and data got swapped in Perl client
- fix sampling in the python client
- added sum to all metrics and mean to the total
- changed the way we calculate some metrics by using a cumulative sum as it is more efficient for multiple percentile thresholds
- update README mentioning to preferably use ints as values
- Allow multiple metrics to be passed in one UDP packet delimited by a newline character.
- added console backend
- reformat topkeys log to feature sane key/value pairs

## v0.3.0 (05/16/2012)
- support backends installed from npm
- fix test suite failures

## v0.2.1 (05/14/2012)
- add graphite backend in debian packaging

## v0.2.0 (05/04/2012)
- support for pluggable backends

## v0.1.1 (05/02/2012)
- add gauges type
- percentThreshold also accepts list of percentiles
- base sampling on sampleRate
- updates for debian packaging
- client example updates

## v0.1.0 (02/17/2012)
- initial npm release
