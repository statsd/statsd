// Copyright (c) 2010 Etsy
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

/*

StatsD is a network daemon that runs on the Node.js platform and listens for
statistics, like counters and timers, sent over UDP and sends aggregates to one
or more pluggable backend services (e.g., Graphite).

StatsD was written at Etsy. We blogged about how it works and why we created it:
http://codeascraft.com/2011/02/15/measure-anything-measure-everything/

To install this Go client, use go get:

	go get github.com/etsy/statsd

This client's documentation can be found on godoc.org:
http://godoc.org/github.com/etsy/statsd/examples/go

Example usage:

	package main

	import (
		"github.com/etsy/statsd/examples/go"
		"time"
	)

	func main() {
		// Record a start time
		t1 := time.Now()

		// Create a new StatsD connection
		host := "localhost"
		port := 8125

		client := statsd.New(host, port)

		// Increment a stat counter
		client.Increment("stat.metric1")

		// Decrement a stat counter
		client.Decrement("stat.metric1")

		// Record an end time
		t2 := time.Now()

		// Submit timing information
		duration := int64(t2.Sub(t1) / time.Millisecond)
		client.Timing("stat.timer", duration)
	}

*/
package statsd
