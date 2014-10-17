Server Interface
-----------------

Server modules are Node.js [modules][nodemods] that receive metrics for StatsD.
Each server module should export the following initialization function:

* `start(config, callback)`: This method is invoked from StatsD to initialize
  and start the server module listening for metrics. It accepts two
  parameters: `config` is the parsed config file hash and `callback` is a
  function to call with metrics data, when it's available.

  The callback function accepts two parameters: `packet` contains one or more
  metrics separated by the \n character, and `rinfo` contains remote address
  information.

  The server module should return `true` from start() to indicate
  success. A return of `false` indicates a failure to load the module
  (missing configuration?) and will cause StatsD to exit.
