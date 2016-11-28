var helper = require('./helper')
var net = require('net')
var portfinder = require('portfinder')
var test = require('tape')

test('TCP connect works (echo test)', function (t) {
  portfinder.getPort(function (err, port) {
    t.error(err, 'Found free port')
    var child

    var server = net.createServer()

    server.on('listening', function () {
      var env = { PORT: port }
      helper.browserify('tcp-connect.js', env, function (err) {
        t.error(err, 'Clean browserify build')
        child = helper.launchBrowser()
      })
    })

    var i = 0
    server.on('connection', function (c) {
      c.on('data', function (data) {
        if (i === 0) {
          t.equal(data.toString(), 'beep', 'Got beep')
          c.write('boop', 'utf8')
        } else if (i === 1) {
          t.equal(data.toString(), 'pass', 'Boop was received')
          c.end()
          server.close()
          child.kill()
          t.end()
        } else {
          t.fail('TCP client sent unexpected data')
        }
        i += 1
      })
    })

    server.listen(port)
  })
})