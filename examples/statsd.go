package statsd

import (
	"net"
	"fmt"
	"log"
)

type StatsdClient struct {
	Host string
	Port int
	conn net.Conn
}

/**
 * Factory method to initialize udp connection
 * Usage:
 *
 * import "statsd"
 * client := statsd.Net('localhost', 8125)
 **/
func New(host string, port int) *StatsdClient {
	client := StatsdClient{Host: host, Port: port}
	client.Open()
	return &client
}

/**
 * Method to open udp connection, called by default client factory
 **/
func (client *StatsdClient) Open() {
	connectionString := fmt.Sprintf("%s:%d", client.Host, client.Port)
	conn, err := net.Dial("udp", connectionString)
	if err != nil {
		log.Println(err)
	}
	client.conn = conn
}

/**
 * Method to close udp connection
 **/
func (client *StatsdClient) Close() {
	client.conn.Close()
}

/*
 * Log timing information (in milliseconds) without sampling
 * Usage:
 *
 * import "statsd"
 * import "time"
 * client := statsd.New('localhost', 8125)
 * t1 := time.Now()
 * expensiveCall()
 * t2 := time.Now()
 * duration := int64(t2.Sub(t1)/time.Millisecond)
 * client.Timing("foo.time", duration)
 **/
func (client *StatsdClient) Timing(stat string, time int64) {
	updateString := fmt.Sprintf("%d|ms", time)
	stats := map[string]string{stat: updateString}
	client.Send(stats, 1)
}

/**
 * Log timing information (in milliseconds) with sampling
 * Usage:
 *
 * import "statsd"
 * import "time"
 * client := statsd.New('localhost', 8125)
 * t1 := time.Now()
 * expensiveCall()
 * t2 := time.Now()
 * duration := int64(t2.Sub(t1)/time.Millisecond)
 * client.TimingWithSampleRate("foo.time", duration, 0.2)
 **/
func (client *StatsdClient) TimingWithSampleRate(stat string, time int64, sampleRate float32) {
	updateString := fmt.Sprintf("%d|ms", time)
	stats := map[string]string{stat: updateString}
	client.Send(stats, sampleRate)
}

/**
 * Increments one stat counter without sampling
 * Usage:
 *
 * import "statsd"
 * client := statsd.New('localhost', 8125)
 * client.Increment('foo.bar')
 **/
func (client *StatsdClient) Increment(stat string) {
	stats := []string{stat}
	client.UpdateStats(stats, 1, 1)
}

/**
 * Increments one stat counter with sampling
 * Usage:
 *
 * import "statsd"
 * client := statsd.New('localhost', 8125)
 * client.Increment('foo.bar', 0.2)
 **/
func (client *StatsdClient) IncrementWithSampling(stat string, sampleRate float32) {
	stats := []string{stat}
	client.UpdateStats(stats[:], 1, sampleRate)
}

/**
 * Decrements one stat counter without sampling
 * Usage:
 *
 * import "statsd"
 * client := statsd.New('localhost', 8125)
 * client.Decrement('foo.bar')
 **/
func (client *StatsdClient) Decrement(stat string) {
	stats := []string{stat}
	client.UpdateStats(stats[:], -1, 1)
}

/**
 * Decrements one stat counter with sampling
 * Usage:
 *
 * import "statsd"
 * client := statsd.New('localhost', 8125)
 * client.Decrement('foo.bar', 0.2)
 **/
func (client *StatsdClient) DecrementWithSampling(stat string, sampleRate float32) {
	stats := []string{stat}
	client.UpdateStats(stats[:], -1, sampleRate)
}

/**
 * Arbitrarily updates a list of stats by a delta
 **/
func (client *StatsdClient) UpdateStats(stats []string, delta int, sampleRate float32) {
	statsToSend := make(map[string]string)
	for _,stat := range stats {
		updateString := fmt.Sprintf("%d|c", delta)
		statsToSend[stat] = updateString
	}
	client.Send(statsToSend, sampleRate)
}

/**
 * Sends data to udp statsd daemon
 **/
func (client *StatsdClient) Send(data map[string]string, sample_rate float32) {
	for k, v := range data {
		update_string := fmt.Sprintf("%s:%s", k, v)
		_,err := fmt.Fprintf(client.conn, update_string)
		if err != nil {
			log.Println(err)
		}
	}
}
