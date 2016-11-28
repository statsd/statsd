var dgram = require('dgram')
var helper = require('./helper')
var portfinder = require('portfinder')
var test = require('tape')

test('UDP works (echo test)', function (t) {
  portfinder.getPort(function (err, port) {
    t.error(err, 'Found free ports')
    var socket = dgram.createSocket('udp4')
    var child

    socket.on('listening', function () {
      var env = { PORT: port }
      helper.browserify('dgram.js', env, function (err) {
        t.error(err, 'Clean browserify build')
        child = helper.launchBrowser()
      })
    })

    var i = 0
    socket.on('message', function (message, remote) {
      if (i === 0) {
        t.equal(message.toString(), 'beep', 'Got beep')
        var boop = new Buffer('boop')
        socket.send(boop, 0, boop.length, remote.port, remote.address)
      } else if (i === 1) {
        t.equal(message.toString(), 'pass', 'Boop was received')
        socket.close()
        child.kill()
        t.end()
      } else {
        t.fail('UDP client sent unexpected message')
      }
      i += 1
    })

    socket.bind(port)
  })
})

