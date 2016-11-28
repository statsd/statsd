# chrome-net
[![NPM Version](http://img.shields.io/npm/v/chrome-net.svg)](https://npmjs.org/package/chrome-net)
[![NPM](http://img.shields.io/npm/dm/chrome-net.svg)](https://npmjs.org/package/chrome-net)
[![Gittip](http://img.shields.io/gittip/feross.svg)](https://www.gittip.com/feross/)

### Use the Node `net` API in Chrome Apps

This module lets you use the Node.js [net](http://nodejs.org/api/net.html) (TCP) API in [Chrome Packaged Apps](http://developer.chrome.com/apps/about_apps.html).

Instead of learning the quirks of Chrome's `chrome.socket` API for networking in Chrome Apps just **use the higher-level node API you're familiar with**. Then, compile your code with [browserify](https://github.com/substack/node-browserify) and you're all set!

This module is used by [webtorrent](https://github.com/feross/webtorrent).

## install

```
npm install chrome-net
```

## methods

Use node's `net` API, including all parameter list shorthands and variations.

Example TCP client:

```js
var net = require('chrome-net')

var client = net.createConnection({
  port: 1337,
  host: '127.0.0.1'
})

client.write('beep')

client.on('data', function (data) {
  console.log(data)
})

// .pipe() streaming API works too!

```

Example TCP server:

```js
var net = require('chrome-net')

var server = net.createServer()

server.on('listening', function () {
  console.log('listening')
})

server.on('connection', function (sock) {
  console.log('Connection from ' + sock.remoteAddress + ':' + sock.remotePort)
  sock.on('data', function (data) {
    console.log(data)
  })
})

server.listen(1337)

```

See nodejs.org for full API documentation: [net](http://nodejs.org/api/net.html)

## contribute

To run tests, use `npm test`. The tests will run TCP and UDP servers and launch a few different Chrome Packaged Apps with browserified client code. The tests currently require Chrome Canary on Mac. If you're on Windows or Linux, feel free to send a pull request to fix this limitation.

## license

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org) & John Hiesey.
