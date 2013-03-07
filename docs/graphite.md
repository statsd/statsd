Graphite Schema
---------------

Graphite uses "schemas" to define the different round robin datasets it houses
(analogous to RRAs in rrdtool). Here's an example for the stats databases:

In conf/storage-schemas.conf:

    [stats]
    pattern = ^stats.*
    retentions = 10:2160,60:10080,600:262974

In conf/storage-aggregation.conf:

    [min]
    pattern = \.min$
    xFilesFactor = 0.1
    aggregationMethod = min

    [max]
    pattern = \.max$
    xFilesFactor = 0.1
    aggregationMethod = max

    [sum]
    pattern = \.count$
    xFilesFactor = 0
    aggregationMethod = sum

    [default_average]
    pattern = .*
    xFilesFactor = 0.3
    aggregationMethod = average

This translates to:

* 6 hours of 10 second data (what we consider "near-realtime")
* 1 week of 1 minute data
* 5 years of 10 minute data
* For databases with 'min' or 'max' in the name, keep only the minimum and
  maximum value when rolling up data and store a None if less than 10% of the
  datapoints were received
* For databases with 'count' in the name, add all the values together, and
  store only a None if none of the datapoints were received
* For all other databases, average the values (mean) when rolling up data, and
  store a None if less than 30% of the datapoints were received

(Note: Newer versions of Graphite can take human readable time formats like
10s:6h,1min:7d,10min:5y)

Retentions and aggregations are read from the file in order, the first pattern
that matches is used.  This is set when the database is first created, changing
these config files will not change databases that have already been created.
To view or alter the settings on existing files, use whisper-info.py and
whisper-resize.py included with the Whisper package.

These settings have been a good tradeoff so far between size-of-file (round
robin databases are fixed size) and data we care about. Each "stats" database
is about 3.2 megs with these retentions.

Many users have been confused to see their hit counts averaged, missing when
the data is intermittent, or never stored when statsd is sending at a different
interval than graphite expects.  Storage aggregation settings will help you
control this and understand what Graphite is doing internally with your data.


