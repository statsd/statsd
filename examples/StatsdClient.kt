/**
 * StatsdClient.kt
 *
 *
 * Example usage:
 *
 *    val client = StatsdClient("statsd.example.com", 8125)
 *    // increment by 1
 *    client.increment("foo.bar.baz")
 *    // increment by 10
 *    client.increment("foo.bar.baz", magnitude = 10)
 *    // sample rate
 *    client.increment("foo.bar.baz", sampleRate = 0.1)
 *    // magnitude and sample rate
 *    client.increment("foo.bar.baz", magnitude = 10, sampleRate = 0.1)
 *    // increment multiple keys by 1
 *    client.increment("foo.bar.baz", "foo.bar.boo", "foo.baz.bar")
 *    // increment multiple keys by 10
 *    client.increment("foo.bar.baz", "foo.bar.boo", "foo.baz.bar", magnitude = 10)
 *    // multiple keys with a sample rate and magnitude
 *    client.increment("foo.bar.baz", "foo.bar.boo", "foo.baz.bar", magnitude = 10, sampleRate = 0.1)
 */

import org.apache.log4j.Logger
import java.io.IOException
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.StandardSocketOptions
import java.net.UnknownHostException
import java.nio.ByteBuffer
import java.nio.channels.DatagramChannel
import java.util.Locale
import java.util.Random
import java.util.Timer
import java.util.TimerTask

class StatsdClient @Throws(IOException::class)
constructor(host: InetAddress, port: Int) : TimerTask() {
  private var sendBuffer: ByteBuffer? = null
  private var flushTimer: Timer? = null
  private var multiMetrics = false

  private val address: InetSocketAddress = InetSocketAddress(host, port)
  private val channel: DatagramChannel = DatagramChannel.open()

  @Throws(UnknownHostException::class, IOException::class)
  constructor(host: String, port: Int) : this(InetAddress.getByName(host), port)

  init {
    // Put this in non-blocking mode so send does not block forever.
    channel.configureBlocking(false)
    // Increase the size of the output buffer so that the size is larger than our buffer size.
    channel.setOption(StandardSocketOptions.SO_SNDBUF, 4096)
    setBufferSize(1500)
  }

  @Synchronized
  fun setBufferSize(packetBufferSize: Short) {
    if (sendBuffer != null) {
      flush()
    }
    sendBuffer = ByteBuffer.allocate(packetBufferSize.toInt())
  }

  @Synchronized
  fun enableMultiMetrics(enable: Boolean) {
    multiMetrics = enable
  }

  @Synchronized
  fun startFlushTimer(period: Long = 2000): Boolean {
    return if (flushTimer == null) {
      flushTimer = Timer()

      // We pass this object in as the TimerTask (which calls run())
      flushTimer!!.schedule(this, period, period)
      true
    } else {
      false
    }
  }

  @Synchronized
  fun stopFlushTimer() {
    if (flushTimer != null) {
      flushTimer!!.cancel()
      flushTimer = null
    }
  }

  // used by Timer, we're a Runnable TimerTask
  override fun run() {
    flush()
  }

  fun timing(key: String, value: Int, sampleRate: Double = 1.0): Boolean {
    return send(sampleRate, String.format(Locale.ENGLISH, "%s:%d|ms", key, value))
  }

  fun decrement(vararg keys: String, magnitude: Int = -1, sampleRate: Double = 1.0): Boolean {
    val stats = keys.map { String.format(Locale.ENGLISH, "%s:%s|c", it, magnitude) }.toTypedArray()

    return send(sampleRate, *stats)
  }

  fun increment(vararg keys: String, magnitude: Int = 1, sampleRate: Double = 1.0): Boolean {
    val stats = keys.map { String.format(Locale.ENGLISH, "%s:%s|c", it, magnitude) }.toTypedArray()

    return send(sampleRate, *stats)
  }

  fun gauge(key: String, magnitude: Double, sampleRate: Double = 1.0): Boolean {
    val stat = String.format(Locale.ENGLISH, "%s:%s|g", key, magnitude)

    return send(sampleRate, stat)
  }

  private fun send(sampleRate: Double, vararg stats: String): Boolean {
    return if (sampleRate < 1.0) {
      stats.any {
        if (RNG.nextDouble() <= sampleRate) {
          val stat = String.format(Locale.ENGLISH, "%s|@%f", it, sampleRate)

          doSend(stat)
        } else {
          false
        }
      }
    } else {
      stats.any { doSend(it) }
    }
  }

  @Synchronized
  private fun doSend(stat: String): Boolean {
    try {
      val data = stat.toByteArray(charset("utf-8"))

      // If we're going to go past the threshold of the buffer then flush.
      // the +1 is for the potential '\n' in multi_metrics below
      if (sendBuffer!!.remaining() < data.size + 1) {
        flush()
      }

      // multiple metrics are separated by '\n'
      if (sendBuffer!!.position() > 0) {
        sendBuffer!!.put('\n'.toByte())
      }

      sendBuffer!!.put(data)

      if (!multiMetrics) {
        flush()
      }

      return true
    } catch (e: IOException) {
      log.error(String.format("Could not send stat %s to host %s:%d", sendBuffer!!.toString(), address.hostName, address.port), e)

      return false
    }
  }

  @Synchronized
  fun flush(): Boolean {
    try {
      val sizeOfBuffer = sendBuffer!!.position()

      if (sizeOfBuffer <= 0) {
        return false
      } // empty buffer

      // send and reset the buffer
      sendBuffer!!.flip()

      val nbSentBytes = channel.send(sendBuffer, address)

      sendBuffer!!.limit(sendBuffer!!.capacity())
      sendBuffer!!.rewind()

      return if (sizeOfBuffer == nbSentBytes) {
        true
      } else {
        log.error(String.format(
          "Could not send entirely stat %s to host %s:%d. Only sent %d bytes out of %d bytes",
          sendBuffer!!.toString(),
          address.hostName,
          address.port,
          nbSentBytes,
          sizeOfBuffer
        ))

        false
      }
    } catch (e: IOException) {
      /* This would be a good place to close the channel down and recreate it. */
      log.error(String.format("Could not send stat %s to host %s:%d", sendBuffer!!.toString(), address.hostName, address.port), e)
      return false
    }
  }

  companion object {
    private val RNG = Random()
    private val log = Logger.getLogger(StatsdClient::class.java.name)
  }
}
