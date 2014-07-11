/**
 * UDP / Datagram Sockets
 * ======================
 *
 * Datagram sockets are available through require('chrome-dgram').
 */

exports.Socket = Socket

var EventEmitter = require('events').EventEmitter
var util = require('util')

var BIND_STATE_UNBOUND = 0
var BIND_STATE_BINDING = 1
var BIND_STATE_BOUND = 2

// Track open sockets to route incoming data (via onReceive) to the right handlers.
var sockets = {}

if (typeof chrome !== 'undefined') {
  chrome.sockets.udp.onReceive.addListener(onReceive)
  chrome.sockets.udp.onReceiveError.addListener(onReceiveError)
}

function onReceive (info) {
  if (info.socketId in sockets) {
    sockets[info.socketId]._onReceive(info)
  } else {
    console.error('Unknown socket id: ' + info.socketId)
  }
}

function onReceiveError (info) {
  if (info.socketId in sockets) {
    sockets[info.socketId]._onReceiveError(info.resultCode)
  } else {
    console.error('Unknown socket id: ' + info.socketId)
  }
}

/**
 * dgram.createSocket(type, [callback])
 *
 * Creates a datagram Socket of the specified types. Valid types are `udp4`
 * and `udp6`.
 *
 * Takes an optional callback which is added as a listener for message events.
 *
 * Call socket.bind if you want to receive datagrams. socket.bind() will bind
 * to the "all interfaces" address on a random port (it does the right thing
 * for both udp4 and udp6 sockets). You can then retrieve the address and port
 * with socket.address().address and socket.address().port.
 *
 * @param  {string} type       Either 'udp4' or 'udp6'
 * @param  {function} listener Attached as a listener to message events.
 *                             Optional
 * @return {Socket}            Socket object
 */
exports.createSocket = function (type, listener) {
  return new Socket(type, listener)
}

util.inherits(Socket, EventEmitter)

/**
 * Class: dgram.Socket
 *
 * The dgram Socket class encapsulates the datagram functionality. It should
 * be created via `dgram.createSocket(type, [callback])`.
 *
 * Event: 'message'
 *   - msg Buffer object. The message
 *   - rinfo Object. Remote address information
 *   Emitted when a new datagram is available on a socket. msg is a Buffer and
 *   rinfo is an object with the sender's address information and the number
 *   of bytes in the datagram.
 *
 * Event: 'listening'
 *   Emitted when a socket starts listening for datagrams. This happens as soon
 *   as UDP sockets are created.
 *
 * Event: 'close'
 *   Emitted when a socket is closed with close(). No new message events will
 *   be emitted on this socket.
 *
 * Event: 'error'
 *   - exception Error object
 *   Emitted when an error occurs.
 */
function Socket (type, listener) {
  var self = this
  EventEmitter.call(self)

  if (type !== 'udp4')
    throw new Error('Bad socket type specified. Valid types are: udp4')

  if (typeof listener === 'function')
    self.on('message', listener)

  self._destroyed = false
  self._bindState = BIND_STATE_UNBOUND
}

/**
 * socket.bind(port, [address], [callback])
 *
 * For UDP sockets, listen for datagrams on a named port and optional address.
 * If address is not specified, the OS will try to listen on all addresses.
 * After binding is done, a "listening" event is emitted and the callback(if
 * specified) is called. Specifying both a "listening" event listener and
 * callback is not harmful but not very useful.
 *
 * A bound datagram socket keeps the node process running to receive
 * datagrams.
 *
 * If binding fails, an "error" event is generated. In rare case (e.g. binding
 * a closed socket), an Error may be thrown by this method.
 *
 * @param {number} port
 * @param {string} address Optional
 * @param {function} callback Function with no parameters, Optional. Callback
 *                            when binding is done.
 */
Socket.prototype.bind = function (port, address, callback) {
  var self = this
  if (typeof address === 'function') {
    callback = address
    address = undefined
  }

  if (!address)
    address = '0.0.0.0'

  if (self._bindState !== BIND_STATE_UNBOUND)
    throw new Error('Socket is already bound')

  self._bindState = BIND_STATE_BINDING

  if (typeof callback === 'function')
    self.once('listening', callback)

  chrome.sockets.udp.create(function (createInfo) {
    self.id = createInfo.socketId

    sockets[self.id] = self
    chrome.sockets.udp.bind(self.id, address, port, function (result) {
      if (result < 0) {
        self.emit('error', new Error('Socket ' + self.id + ' failed to bind. ' +
          chrome.runtime.lastError.message))
        return
      }
      chrome.sockets.udp.getInfo(self.id, function (socketInfo) {
        if (!socketInfo.localPort || !socketInfo.localAddress) {
          self.emit(new Error('Cannot get local port/address for Socket ' + self.id))
          return
        }

        self._port = socketInfo.localPort
        self._address = socketInfo.localAddress

        self._bindState = BIND_STATE_BOUND
        self.emit('listening')
      })
    })
  })
}

/**
 * Internal function to receive new messages and emit `message` events.
 */
Socket.prototype._onReceive = function (info) {
  var self = this

  var buf = new Buffer(new Uint8Array(info.data))
  var rinfo = {
    address: info.remoteAddress,
    family: 'IPv4',
    port: info.remotePort,
    size: buf.length
  }
  self.emit('message', buf, rinfo)
}

Socket.prototype._onReceiveError = function (resultCode) {
  var self = this
  self.emit('error', new Error('Socket ' + self.id + ' receive error ' + resultCode))
}

/**
 * socket.send(buf, offset, length, port, address, [callback])
 *
 * For UDP sockets, the destination port and IP address must be
 * specified. A string may be supplied for the address parameter, and it will
 * be resolved with DNS. An optional callback may be specified to detect any
 * DNS errors and when buf may be re-used. Note that DNS lookups will delay
 * the time that a send takes place, at least until the next tick. The only
 * way to know for sure that a send has taken place is to use the callback.
 *
 * If the socket has not been previously bound with a call to bind, it's
 * assigned a random port number and bound to the "all interfaces" address
 * (0.0.0.0 for udp4 sockets, ::0 for udp6 sockets).
 *
 * @param {Buffer|Arrayish|string} buf Message to be sent
 * @param {number} offset Offset in the buffer where the message starts.
 * @param {number} length Number of bytes in the message.
 * @param {number} port destination port
 * @param {string} address destination IP
 * @param {function} callback Callback when message is done being delivered.
 *                            Optional.
 */
// Socket.prototype.send = function (buf, host, port, cb) {
Socket.prototype.send = function (buffer, offset, length, port, address, callback) {
  var self = this
  if (!callback) callback = function () {}

  if (offset !== 0)
    throw new Error('Non-zero offset not supported yet')

  if (self._bindState === BIND_STATE_UNBOUND)
    self.bind(0)

  // If the socket hasn't been bound yet, push the outbound packet onto the
  // send queue and send after binding is complete.
  if (self._bindState !== BIND_STATE_BOUND) {
    // If the send queue hasn't been initialized yet, do it, and install an
    // event handler that flishes the send queue after binding is done.
    if (!self._sendQueue) {
      self._sendQueue = []
      self.once('listening', function () {
        // Flush the send queue.
        for (var i = 0; i < self._sendQueue.length; i++) {
          self.send.apply(self, self._sendQueue[i])
        }
        self._sendQueue = undefined
      })
    }
    self._sendQueue.push([buffer, offset, length, port, address, callback])
    return
  }

  if (!Buffer.isBuffer(buffer)) buffer = new Buffer(buffer)
  // assuming buffer is browser implementation (`buffer` package on npm)
  chrome.sockets.udp.send(self.id, buffer.buffer /* buffer.toArrayBuffer() is slower */,
                      address, port, function (sendInfo) {
    if (sendInfo.resultCode < 0) {
      var err = new Error('Socket ' + self.id + ' send error ' + sendInfo.resultCode)
      callback(err)
      self.emit('error', err)
    } else {
      callback(null)
    }
  })
}

/**
 * Close the underlying socket and stop listening for data on it.
 */
Socket.prototype.close = function () {
  var self = this
  if (self._destroyed)
    return

  delete sockets[self.id]
  chrome.sockets.udp.close(self.id)
  self._destroyed = true

  self.emit('close')
}

/**
 * Returns an object containing the address information for a socket. For UDP
 * sockets, this object will contain address, family and port.
 *
 * @return {Object} information
 */
Socket.prototype.address = function () {
  var self = this
  return {
    address: self._address,
    port: self._port,
    family: 'IPv4'
  }
}

Socket.prototype.setBroadcast = function (flag) {
  // No chrome.sockets equivalent
}

Socket.prototype.setTTL = function (ttl) {
  // No chrome.sockets equivalent
}

// NOTE: Multicast code is untested. Pull requests accepted for bug fixes and to
// add tests!

/**
 * Sets the IP_MULTICAST_TTL socket option. TTL stands for "Time to Live," but
 * in this context it specifies the number of IP hops that a packet is allowed
 * to go through, specifically for multicast traffic. Each router or gateway
 * that forwards a packet decrements the TTL. If the TTL is decremented to 0
 * by a router, it will not be forwarded.
 *
 * The argument to setMulticastTTL() is a number of hops between 0 and 255.
 * The default on most systems is 1.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * @param {number} ttl
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.setMulticastTTL = function (ttl, callback) {
  var self = this
  if (!callback) callback = function () {}
  chrome.sockets.udp.setMulticastTimeToLive(self.id, ttl, callback)
}

/**
 * Sets or clears the IP_MULTICAST_LOOP socket option. When this option is
 * set, multicast packets will also be received on the local interface.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * @param {boolean} flag
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.setMulticastLoopback = function (flag, callback) {
  var self = this
  if (!callback) callback = function () {}
  chrome.sockets.udp.setMulticastLoopbackMode(self.id, flag, callback)
}

/**
 * Tells the kernel to join a multicast group with IP_ADD_MEMBERSHIP socket
 * option.
 *
 * If multicastInterface is not specified, the OS will try to add membership
 * to all valid interfaces.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * @param {string} multicastAddress
 * @param {string} [multicastInterface] Optional
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.addMembership = function (multicastAddress,
                                           multicastInterface,
                                           callback) {
  var self = this
  if (!callback) callback = function () {}
  chrome.sockets.udp.joinGroup(self.id, multicastAddress, callback)
}

/**
 * Opposite of addMembership - tells the kernel to leave a multicast group
 * with IP_DROP_MEMBERSHIP socket option. This is automatically called by the
 * kernel when the socket is closed or process terminates, so most apps will
 * never need to call this.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * If multicastInterface is not specified, the OS will try to drop membership
 * to all valid interfaces.
 *
 * @param  {[type]} multicastAddress
 * @param  {[type]} multicastInterface Optional
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.dropMembership = function (multicastAddress,
                                            multicastInterface,
                                            callback) {
  var self = this
  if (!callback) callback = function () {}
  chrome.sockets.udp.leaveGroup(self.id, multicastAddress, callback)
}

Socket.prototype.unref = function () {
  // No chrome.sockets equivalent
}

Socket.prototype.ref = function () {
  // No chrome.sockets equivalent
}
