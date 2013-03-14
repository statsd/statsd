/*

Scala implementation of Andrew Gwozdziewycz's StatsdClient.java

Copyright (c) 2013 Joshua Garnett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

package com.statsd

import java.io.IOException
import java.net._
import java.nio.ByteBuffer
import java.nio.channels.DatagramChannel
import java.util.Random
import org.slf4j.LoggerFactory
import akka.actor._

/**
 * Client for sending stats to StatsD uses Akka to manage concurrency
 *
 * @param context The Akka ActorContext
 * @param host The statsd host
 * @param port The statsd port
 * @param multiMetrics If true, multiple stats will be sent in a single UDP packet
 * @param packetBufferSize If multiMetrics is true, this is the max buffer size before sending the UDP packet
 */
class StatsD(context: ActorContext,
             host: String,
             port: Int,
             multiMetrics: Boolean = true,
             packetBufferSize: Int = 1024) {

  private val rand = new Random()

  private val actorRef = context.actorOf(Props(new StatsDActor(host, port, multiMetrics, packetBufferSize)))

  /**
   * Sends timing stats in milliseconds to StatsD
   *
   * @param key name of the stat
   * @param value time in milliseconds
   */
  def timing(key: String, value: Int, sampleRate: Double = 1.0) = {
    send(key, value.toString, StatsDProtocol.TIMING_METRIC, sampleRate)
  }

  /**
   * Decrement StatsD counter
   *
   * @param key name of the stat
   * @param magnitude how much to decrement
   */
  def decrement(key: String, magnitude: Int = -1, sampleRate: Double = 1.0) = {
    increment(key, magnitude, sampleRate)
  }

  /**
   * Increment StatsD counter
   *
   * @param key name of the stat
   * @param magnitude how much to increment
   */
  def increment(key: String, magnitude: Int = 1, sampleRate: Double = 1.0) = {
    send(key, magnitude.toString, StatsDProtocol.COUNTER_METRIC, sampleRate)
  }

  /**
   * StatsD now also supports gauges, arbitrary values, which can be recorded.
   *
   * @param key name of the stat
   * @param value Can be a fixed value or increase or decrease (Ex: "10" "-1" "+5")
   */
  def gauge(key: String, value: String = "1", sampleRate: Double = 1.0) = {
    send(key, value, StatsDProtocol.GAUGE_METRIC, sampleRate)
  }

  /**
   * StatsD supports counting unique occurrences of events between flushes, using a Set to store all occurring events.
   *
   * @param key name of the stat
   * @param value value of the set
   */
  def set(key: String, value: Int, sampleRate: Double = 1.0) = {
    send(key, value.toString, StatsDProtocol.SET_METRIC, sampleRate)
  }

  /**
   * Checks the sample rate and sends the stat to the actor if it passes
   */
  private def send(key: String, value: String, metric: String, sampleRate: Double): Boolean = {
    if (sampleRate >= 1 || rand.nextDouble <= sampleRate) {
      actorRef ! SendStat(StatsDProtocol.stat(key, value, metric, sampleRate))
      true
    }
    else {
      false
    }
  }
}

object StatsDProtocol {
  val TIMING_METRIC = "ms"
  val COUNTER_METRIC = "c"
  val GAUGE_METRIC = "g"
  val SET_METRIC = "s"

  /**
   * @return Returns a string that conforms to the StatsD protocol:
   *         KEY:VALUE|METRIC or KEY:VALUE|METRIC|@SAMPLE_RATE
   */
  def stat(key: String, value: String, metric: String, sampleRate: Double) = {
    val sampleRateString = if (sampleRate < 1) "|@" + sampleRate else ""
    key + ":" + value + "|" + metric + sampleRateString
  }
}

/**
 * Message for the StatsDActor
 */
private case class SendStat(stat: String)

/**
 * @param host The statsd host
 * @param port The statsd port
 * @param multiMetrics If true, multiple stats will be sent in a single UDP packet
 * @param packetBufferSize If multiMetrics is true, this is the max buffer size before sending the UDP packet
 */
private class StatsDActor(host: String,
                          port: Int,
                          multiMetrics: Boolean,
                          packetBufferSize: Int) extends Actor {

  private val log = LoggerFactory.getLogger(getClass())

  private val sendBuffer = ByteBuffer.allocate(packetBufferSize)

  private val address = new InetSocketAddress(InetAddress.getByName(host), port)
  private val channel = DatagramChannel.open()

  def receive = {
    case msg: SendStat => doSend(msg.stat)
    case _             => log.error("Unknown message")
  }

  override def postStop() = {
    //save any remaining data to StatsD
    flush

    //Close the channel
    if (channel.isOpen()) {
      channel.close()
    }

    sendBuffer.clear()
  }

  private def doSend(stat: String) = {
    try {
      val data = stat.getBytes("utf-8")

      // If we're going to go past the threshold of the buffer then flush.
      // the +1 is for the potential '\n' in multi_metrics below
      if (sendBuffer.remaining() < (data.length + 1)) {
        flush
      }

      // multiple metrics are separated by '\n'
      if (sendBuffer.position() > 0) {
        sendBuffer.put('\n'.asInstanceOf[Byte])
      }

      // append the data
      sendBuffer.put(data) 

      if (!multiMetrics) {
        flush
      }

    }
    catch {
      case e: IOException => {
        log.error("Could not send stat {} to host {}:{}", sendBuffer.toString, address.getHostName(), address.getPort().toString, e)
      }
    }
  }

  private def flush(): Unit = {
    try {
      val sizeOfBuffer = sendBuffer.position()

      if (sizeOfBuffer <= 0) {
        // empty buffer
        return
      }

      // send and reset the buffer 
      sendBuffer.flip()
      val nbSentBytes = channel.send(sendBuffer, address)
      sendBuffer.limit(sendBuffer.capacity())
      sendBuffer.rewind()

      if (sizeOfBuffer != nbSentBytes) {
        log.error("Could not send entirely stat {} to host {}:{}. Only sent {} bytes out of {} bytes", sendBuffer.toString(),
          address.getHostName(), address.getPort().toString, nbSentBytes.toString, sizeOfBuffer.toString)
      }

    }
    catch {
      case e: IOException => {
        log.error("Could not send stat {} to host {}:{}", sendBuffer.toString, address.getHostName(), address.getPort().toString, e)
      }
    }
  }
}