# daemon.node

A C++ add-on for Node.js to enable simple daemons in Javascript plus some useful wrappers in Javascript.

## Installation

### Installing npm (node package manager)
<pre>
  curl http://npmjs.org/install.sh | sh
</pre>

### Installing daemon.node with npm
<pre>
  [sudo] npm install daemon
</pre>

### Installing daemon.node locally 
<pre>
  node-waf configure build  
</pre>

## Usage 

There is a great getting started article on daemons and node.js by Slashed that you [can read here][0]. The API has changed slightly from that version thanks to contributions from ptge and [fugue][1]; there is no longer a daemon.closeIO() method, this is done automatically for you.

### Starting a daemon:
Starting a daemon is easy, just call daemon.start() and daemon.lock(). 
<pre>
  var daemon = require('daemon');
  
  // Your awesome code here
  
  fs.open('somefile.log', 'w+', function (err, fd) {
    daemon.daemonize(fd);
    daemon.lock('/tmp/yourprogram.pid');
  });
</pre>

This library also exposes a higher level facility through javascript for starting daemons:
<pre>
  var sys = require('sys'),
      daemon = require('daemon');
  
  // Your awesome code here
  
  daemon.daemonize('somefile.log', '/tmp/yourprogram.pid', function (err, pid) {
    // We are now in the daemon process
    if (err) return sys.puts('Error starting daemon: ' + err);
    
    sys.puts('Daemon started successfully with pid: ' + pid);
  });
</pre>

### The Fine Print
This library is available under the MIT LICENSE. See the LICENSE file for more details. It was created by [Slashed][2] and [forked][3] / [improved][4] / [hacked upon][1] by a lot of good people. Special thanks to [Isaacs][5] for npm and a great example in [glob][6].

#### Author: [Slashed](http://github.com/slashed)
#### Contributors: [Charlie Robbins](http://nodejitsu.com), [Pedro Teixeira](https://github.com/pgte), [James Halliday](https://github.com/substack), [Zak Taylor](https://github.com/dobl), [Daniel Bartlett](https://github.com/danbuk)

[0]: http://slashed.posterous.com/writing-daemons-in-javascript-with-nodejs-0
[1]: https://github.com/pgte/fugue/blob/master/deps/daemon.cc
[2]: https://github.com/slashed/daemon.node
[3]: https://github.com/substack/daemon.node/
[4]: https://github.com/dobl/daemon.node
[5]: https://github.com/isaacs/npm
[6]: 