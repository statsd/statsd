require 'socket'

class Statsd
  @@config = {}
  def self.configure(host, port)
    @@config = {
      :host => host,
      :port => port
    }
  end

  def self.timing(stat, time, sample_rate=1)
    # Log timing information
    # > require 'ruby_example'
    # > Statsd.timing('some.time', 500)
    stats = {}
    stats[stat] = "#{time}|ms"
    Statsd.send(stats, sample_rate)
  end

  def self.increment(stats, sample_rate=1)
    # Increments one or more stats counters
    # > Statsd.increment('some.int')
    # > Statsd.increment('some.int',0.5)
    Statsd.update_stats(stats, 1, sample_rate)
  end

  def self.decrement(stats, sample_rate=1)
    # Decrements one or more stats counters
    # > Statsd.decrement('some.int')
    Statsd.update_stats(stats, -1, sample_rate)
  end

  def self.update_stats(stats, delta=1, sampleRate=1)
    # Updates one or more stats counters by arbitrary amounts
    # > Statsd.update_stats('some.int',10)
    stats = [stats] unless stats.kind_of?(Array)

    data = {}
    stats.each do |stat|
      data[stat] = "#{delta}|c"
    end

    Statsd.send(data, sampleRate)
  end


  def self.send(data, sample_rate=1)
    # Squirt the metrics over UDP
    if @@config[:host].nil? || @@config[:port].nil?
      raise ArgumentError.new("No configuration was specified")
    end

    sampled_data = {}

    if sample_rate < 1 
      if rand <= sample_rate
        data.each_key do |stat|
          value = data[stat]
          sampled_data[stat] = "#{value}|@#{sample_rate}"
        end
      end
    else
      sampled_data = data

      sock = UDPSocket.new
      sampled_data.each_key do |stat|
        value = data[stat]
        sock.send("#{stat}:#{value}", 0, @@config[:host], @@config[:port])
      end
    end
  end
end
