/**
 * StatsdClient.java
 *
 * (C) 2011 Meetup, Inc.
 * Author: Andrew Gwozdziewycz <andrew@meetup.com>, @apgwoz
 *
 * 
 *
 * Example usage:
 *
 *    StatsdClient client = new StatsdClient("statsd.example.com", 8125);
 *    // increment by 1
 *    client.increment("foo.bar.baz");
 *    // increment by 10
 *    client.increment("foo.bar.baz", 10);
 *    // sample rate
 *    client.increment("foo.bar.baz", 10, .1);
 *    // increment multiple keys by 1
 *    client.increment("foo.bar.baz", "foo.bar.boo", "foo.baz.bar");
 *    // increment multiple keys by 10 -- yeah, it's "backwards"
 *    client.increment(10, "foo.bar.baz", "foo.bar.boo", "foo.baz.bar");
 *    // multiple keys with a sample rate
 *    client.increment(10, .1, "foo.bar.baz", "foo.bar.boo", "foo.baz.bar");
 *
 * Note: For best results, and greater availability, you'll probably want to 
 * create a wrapper class which creates a static client and proxies to it.
 *
 * You know... the "Java way."
 */

import java.util.Random;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketException;
import java.net.UnknownHostException;

import org.apache.log4j.Logger;

public class StatsdClient {
	private static Random RNG = new Random();
	private static Logger log = Logger.getLogger(StatsdClient.class.getName());

	private InetAddress _host;
	private int _port;
	
	private DatagramSocket _sock;

	public StatsdClient(String host, int port) throws UnknownHostException, SocketException {
		this(InetAddress.getByName(host), port);
	}

	public StatsdClient(InetAddress host, int port) throws SocketException {
		_host = host;
		_port = port;
		_sock = new DatagramSocket();
	}

	public boolean timing(String key, int value) {
		return timing(key, value, 1.0);
	}

	public boolean timing(String key, int value, double sampleRate) {
		return send(sampleRate, String.format("%s:%d|ms", key, value));
	}

	public boolean decrement(String key) {
		return increment(key, -1, 1.0);
	}

	public boolean decrement(String key, int magnitude) {
		return decrement(key, magnitude, 1.0);
	}

	public boolean decrement(String key, int magnitude, double sampleRate) {
		magnitude = magnitude < 0 ? magnitude: -magnitude;
		return increment(key, magnitude, sampleRate);
	}

	public boolean decrement(String... keys) {
		return increment(-1, 1.0, keys);
	}

	public boolean decrement(int magnitude, String... keys) {
		magnitude = magnitude < 0 ? magnitude: -magnitude;
		return increment(magnitude, 1.0, keys);
	}

	public boolean decrement(int magnitude, double sampleRate, String... keys) {
		magnitude = magnitude < 0 ? magnitude: -magnitude;
		return increment(magnitude, sampleRate, keys);
	}

	public boolean increment(String key) {
		return increment(key, 1, 1.0);
	}

	public boolean increment(String key, int magnitude) {
		return increment(key, magnitude, 1.0);
	}

	public boolean increment(String key, int magnitude, double sampleRate) {
		String stat = String.format("%s:%s|c", key, magnitude);
		return send(stat, sampleRate);
	}

	public boolean increment(int magnitude, double sampleRate, String... keys) {
		String[] stats = new String[keys.length];
		for (int i = 0; i < keys.length; i++) {
			stats[i] = String.format("%s:%s|c", keys[i], magnitude);
		}
		return send(sampleRate, stats);
	}

	private boolean send(String stat, double sampleRate) {
		return send(sampleRate, stat);
	}

	private boolean send(double sampleRate, String... stats) {

		boolean retval = false; // didn't send anything
		if (sampleRate < 1.0) {
			for (String stat : stats) {
				if (RNG.nextDouble() <= sampleRate) {
					stat = String.format("%s|@%f", stat, sampleRate);
					if (doSend(stat)) {
						retval = true;
					}
				}
			}
		}
		else {
			for (String stat : stats) {
				if (doSend(stat)) {
					retval = true;
				}
			}
		}

		return retval;
	}

	private boolean doSend(String stat) {
		try {
			byte[] data = stat.getBytes();
			_sock.send(new DatagramPacket(data, data.length, _host, _port));
			return true;
		}
		catch (IOException e) {
			log.error(String.format("Could not send stat %s to host %s:%d", stat, _host, _port), e);
		}
		return false;
	}
}