var chromeNet = require('../')
var test = require('tape')

test('net.isIP', function (t) {
  t.ok(chromeNet.isIP('1.2.3.4'))
  t.ok(chromeNet.isIP('2001:0db8:3c4d:0015:0000:0000:abcd:ef12'))

  t.ok(!chromeNet.isIP(''))
  t.ok(!chromeNet.isIP('abc'))
  t.ok(!chromeNet.isIP(undefined))
  t.ok(!chromeNet.isIP(null))
  t.ok(!chromeNet.isIP({}))
  t.end()
})

test('net.isIPv4', function (t) {
  t.ok(chromeNet.isIPv4('1.2.3.4'))

  t.ok(!chromeNet.isIPv4('2001:0db8:3c4d:0015:0000:0000:abcd:ef12'))
  t.ok(!chromeNet.isIPv4(''))
  t.ok(!chromeNet.isIPv4('abc'))
  t.ok(!chromeNet.isIPv4(undefined))
  t.ok(!chromeNet.isIPv4(null))
  t.ok(!chromeNet.isIPv4({}))
  t.end()
})

test('net.isIPv6', function (t) {
  t.ok(chromeNet.isIPv6('2001:0db8:3c4d:0015:0000:0000:abcd:ef12'))

  t.ok(!chromeNet.isIPv6('1.2.3.4'))
  t.ok(!chromeNet.isIPv6(''))
  t.ok(!chromeNet.isIPv6('abc'))
  t.ok(!chromeNet.isIPv6(undefined))
  t.ok(!chromeNet.isIPv6(null))
  t.ok(!chromeNet.isIPv6({}))
  t.end()
})