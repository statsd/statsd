Backend Interface
-----------------

Backend modules are Node.js [modules][nodemods] that listen for a
number of events emitted from StatsD. Each backend module should
export the following initialization function:

* `init(startup_time, config, events, logger)`: This method is invoked
  from StatsD to initialize the backend module. It accepts four
  parameters: `startup_time` is the startup time of StatsD in epoch
  seconds, `config` is the parsed config file hash, `events` is the
  event emitter that backends can use to listen for events and
  `logger` is StatsD's configured logger for backends to use.

  The backend module should return `true` from init() to indicate
  success. A return of `false` indicates a failure to load the module
  (missing configuration?) and will cause StatsD to exit.

Backends can listen for the following events emitted by StatsD from
the `events` object:

* Event: **'flush'**

  Parameters: `(time_stamp, metrics)`

  Emitted on each flush interval so that backends can push aggregate
  metrics to their respective backend services. The event is passed
  two parameters: `time_stamp` is the current time in epoch seconds
  and `metrics` is a hash representing the StatsD statistics:

  ```
metrics: {
    counters: counters,
    gauges: gauges,
    timers: timers,
    sets: sets,
    counter_rates: counter_rates,
    timer_data: timer_data,
    statsd_metrics: statsd_metrics,
    pctThreshold: pctThreshold
}
  ```

  The counter_rates and timer_data are precalculated statistics to simplify
  the creation of backends, the statsd_metrics hash contains metrics generated
  by statsd itself. Each backend module is passed the same set of
  statistics, so a backend module should treat the metrics as immutable
  structures. StatsD will reset timers and counters after each
  listener has handled the event.

* Event: **'status'**

  Parameters: `(writeCb)`

  Emitted when a user invokes a *stats* command on the management
  server port. It allows each backend module to dump backend-specific
  status statistics to the management port.

  The `writeCb` callback function has a signature of `f(error,
  backend_name, stat_name, stat_value)`. The backend module should
  invoke this method with each stat_name and stat_value that should be
  sent to the management port. StatsD will prefix each stat name with
  the `backend_name`. The backend should set `error` to *null*, or, in
  the case of a failure, an appropriate error.

* Event: **'packet'**

  Parameters: `(packet, rinfo)`

  This is emitted for every incoming packet. The `packet` parameter contains
  the raw received message string and the `rinfo` parameter contains remote
  address information from the UDP socket.


