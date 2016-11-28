var dgram = require('../../')

var PORT = Number(process.env.PORT)

var sock = dgram.createSocket('udp4')

// If any errors are emitted, log them
sock.on('error', function (err) {
  console.error(err.stack)
})

sock.send('beep', 0, 'beep'.length, PORT, '127.0.0.1')

sock.on('message', function (data, rInfo) {
  if (data.toString() === 'boop') {
    sock.send('pass', 0, 'pass'.length, rInfo.port, rInfo.address)
  } else {
    sock.send('fail', 0, 'fail'.length, rInfo.port, rInfo.address)
  }
})
