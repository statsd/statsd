Configuring Graphite for StatsD 
-------------------------------

Many users have been confused to see their hit counts averaged, gone missing when
the data is intermittent, or never stored when statsd is sending at a different
interval than graphite expects. Careful setup of Graphite as suggested below should help to alleviate all these issues. When configuring Graphite, two main factors you need to consider are:

1. What is the highest resolution of data points kept by Graphite, and at which points in time is data downsampled to lower resolutions. This decision is by nature directly related to your functional requirements: how far back should you keep data? what is the data resolution you actually need? However, the retention rules you set must also be in sync with statsd.

2. How should data be aggregated when downsampled, in order to correctly preserve its meaning? Graphite of course knows nothing of the 'meaning' of your data, so let's explore the correct setup for the various metrics sent by statsd.

### Storage Schemas

To define retention and downsampling which match your needs, edit Graphite's conf/storage-schemas.conf file. Here is a simple example file that would handle all metrics sent by statsd:

    [stats]
    pattern = ^stats.*
    retentions = 10s:6h,1min:7d,10min:5y

This translates to: for all metrics starting with 'stats' (i.e. all metrics sent by statsd), capture:

* 6 hours of 10 second data (what we consider "near-realtime")
* 1 week of 1 minute data
* 5 years of 10 minute data

These settings have been a good tradeoff so far between size-of-file (database files are fixed size) and data we care about. Each "stats" database file is about 3.2 megs with these retentions.

Retentions are read from the file in order and the first pattern that matches is used. 
Graphite stores each metric in its own database file, and the retentions take effect when a metric file is first created. This means that changing this config file would not affect any files already created. To view or alter the settings on existing files, use whisper-info.py and whisper-resize.py included with the Whisper package.

#### Correlation with statsd's flush interval:

In the case of the above example, what would happen if you flush from statsd any faster then every 10 seconds? in that case, multiple values for the same metric may reach Graphite at any given 10-second timespan, and only the last value would take hold and be persisted - so your data would immediately be partially lost. 

To fix that, simply ensure your flush interval is at least as long as the highest-resolution retention. However, a long interval may cause other unfortunate mishaps, so keep reading - it pays to understand what's really going on.

(Note: Older versions of Graphite do not support the human-readable time format shown above)

### Storage Aggregation

The next step is ensuring your data isn't corrupted or discarded when downsampled. Continuing with the example above, take for instance the downsampling of .mean values calculated for all statsd timers: 

Graphite should downsample up to 6 samples representing 10-second mean values into a single value signfying the mean for a 1-minute timespan. This is simple: just average all samples to get the new value, and this is exactly the default method applied by Graphite. However, what about the .count metric also sent for timers? Each sample contains the count of occurences per flush interval, so you want these samples summed-up, not averaged! 

You would not even notice any problem till you look at a graph for data older than 6 hours ago, since Graphite would need only the high-res 10-second samples to render the first 6 hours, but would have to switch to lower resolution data for rendering a longer timespan.

Two other metric kinds also deserve a note: 

* Counts which are normalized by statsd to signify a per-second count should not be summed, since their meaning does not change when downsampling. 

* Metrics for minimum/maximum values should not be averaged but rather preserve the lowest/highest point, respectively.

Let's see now how to configure downsampling in Graphite's conf/storage-aggregation.conf:

    [min]
    pattern = \.lower$
    xFilesFactor = 0.1
    aggregationMethod = min

    [max]
    pattern = \.upper$
    xFilesFactor = 0.1
    aggregationMethod = max

    [sum]
    pattern = \.sum$
    xFilesFactor = 0
    aggregationMethod = sum

    [count]
    pattern = \.count$
    xFilesFactor = 0
    aggregationMethod = sum

    [count_legacy]
    pattern = ^stats_counts.*
    xFilesFactor = 0
    aggregationMethod = sum

    [default_average]
    pattern = .*
    xFilesFactor = 0.3
    aggregationMethod = average

This means:

* For metrics ending with '.lower' or '.upper' (these are sent for all timers), keep only the minimum and maximum value when rolling up data and store a None if less than 10% of the datapoints were received.
* For metrics ending with 'count' or 'sum' in the name, or those under 'stats_counts', add all the values together, and store a None only if none of the datapoints were received. This would capture all non-normalized counters, but ignore the per-second ones.
* For all other databases, average the values (mean) when rolling up data, and
  store a None if less than 30% of the datapoints were received

Pay close attention to xFilesFactor: if your flush interval is not long enough so there are not enough samples to satisfy this minimum factor, your data would simply be lost in the first downsampling cycle. However, setting a very low factor would also produce a misleading result, since you would probably agree that if you only have a single 10-second mean value sample reported in a 10-minute timeframe, this single sample alone should not normally be downsampled into a 10-minute mean value. For counts, however, every count should count ;-), hence the zero factor.

**Notes:**

1. a '.count' metric is calculated for all timers, but up to and including v0.5.0, non-normalized counters are written under stats_counts - not under stats.counters as you might expect. Post-0.5.0, if you set legacyNamespace=false in the config then counters would indeed be written under stats.counters, in two variations: per-second counts under stats.counters.\<name\>.*rate*, and non-normalized per-flush counts under stats.counters.\<name\>.*count*. Hence, the rules above would handle counts for both timers and legacy/non-legacy counters.

2. upper and lower values are also calculated for the n-percentile value defined for timers. The above example does not include rules for these, for brevity and performance.

Similar to retentions, the aggregations in effect for any metric are set once the metric is first received, so a change to these settings would not affect existing metrics.

### In conclusion

Graphite's handling of your statsd metrics should be verified at least once: is data mysteriously lost at any point? is data downsampled properly? are you defining graphs for counter metrics without knowing what timespan does each y-value actually represent? (admittedly, in some cases you may not even care about the y-values in the graph, as only the trend is of any interest. The coolest graphs seem to always lack y-values...)

For more information, see: http://graphite.readthedocs.org/en/latest/config-carbon.html
