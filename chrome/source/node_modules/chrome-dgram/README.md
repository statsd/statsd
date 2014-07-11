# chrome-dgram [![npm](https://img.shields.io/npm/v/chrome-dgram.svg)](https://npmjs.org/package/chrome-dgram) [![downloads](https://img.shields.io/npm/dm/chrome-dgram.svg)](https://npmjs.org/package/chrome-dgram) [![gittip](https://img.shields.io/gittip/feross.svg)](https://www.gittip.com/feross/)

### Use the Node `dgram` API in Chrome Apps

This module lets you use the Node.js [dgram](http://nodejs.org/api/dgram.html) (UDP) API in [Chrome Packaged Apps](http://developer.chrome.com/apps/about_apps.html).

Instead of learning the quirks of Chrome's `chrome.sockets` API for networking in Chrome Apps just **use the higher-level node API you're familiar with**. Then, compile your code with [browserify](https://github.com/substack/node-browserify) and you're all set!

This module is used by [webtorrent](https://github.com/feross/webtorrent).

## install

```
npm install chrome-dgram
```

## methods

Use node's `dgram` API, including all parameter list shorthands and variations.

Example UDP client/bind:

```js
var dgram = require('chrome-dgram')

var sock = dgram.createSocket('udp4')

sock.send('beep', 0, 'beep'.length, 1337, '127.0.0.1')

sock.on('message', function (data, rInfo) {
  console.log('Got data from ' + rInfo.address + ':' + rInfo.port)
  console.log(data)
})
```

See nodejs.org for full API documentation: [dgram](http://nodejs.org/api/dgram.html)

## contribute

To run tests, use `npm test`. The tests will run TCP and UDP servers and launch a few different Chrome Packaged Apps with browserified client code. The tests currently require Chrome Canary on Mac. If you're on Windows or Linux, feel free to send a pull request to fix this limitation.

## license

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org) & John Hiesey.
