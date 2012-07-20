# Changelog

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
