require 'socket'
require 'yaml'

# ruby_example.rb

# Ian Sefferman <iseff@iseff.com>
# http://www.iseff.com

# If this is running in a Rails environment,  will pick up config/statsd.yml.
# config/statsd.yml should look like:
# production:
#   host: statsd.domain.com
#   port: 8125
# development:
#   host: localhost
#   port: 8125

# If this file is not running in Rails environment, will pick up ./statsd.yml
# ./statsd.yml should look like:
# host: localhost
# port: 8125

# If neither of these files are present, it will default to localhost:8125

# Sends statistics to the stats daemon over UDP
class Statsd

  def self.timing(stats, time, sample_rate=1)
    Statsd.update_stats(stats, time, sample_rate, 'ms')
  end

  def self.increment(stats, sample_rate=1)
    Statsd.update_stats(stats, 1, sample_rate)
  end

  def self.decrement(stats, sample_rate=1)
    Statsd.update_stats(stats, -1, sample_rate)
  end

  def self.gauges(stats, value, sample_rate=1)
    Statsd.update_stats(stats, value, sample_rate, 'g')
  end

  def self.sets(stats, value, sample_rate=1)
    Statsd.update_stats(stats, value, sample_rate, 's')
  end

  def self.update_stats(stats, delta=1, sample_rate=1, metric='c')
    stats = [stats].flatten

    data = {}
    stats.each do |stat|
      data[stat] = "%s|%s" % [delta, metric]
    end

    Statsd.send(data, sample_rate)
  end

  def self.send(data, sample_rate=1)
    begin
      host = config["host"] || "localhost"
      port = config["port"] || "8125"

      sampled_data = {}
      if sample_rate < 1
        if rand <= sample_rate
          data.each_pair do |stat, val|
            sampled_data[stat] = "%s|@%s" % [val, sample_rate]
          end
        end
      else
        sampled_data = data
      end

      udp = UDPSocket.new
      sampled_data.each_pair do |stat, val|
        send_data = "%s:%s" % [stat, val]
        udp.send send_data, 0, host, port
      end
    rescue => e
      puts e.message
    end
  end

  def self.config
    return @@config if self.class_variable_defined?(:@@config)
    begin
      config_path = File.join(File.dirname(__FILE__), "statsd.yml")
      # for Rails environments, check Rails.root/config/statsd.yml
      if defined? Rails
        config_path = File.join(Rails.root, "config", "statsd.yml")
        @@config = open(config_path) { |f| YAML.load(f) }
        @@config = @@config[Rails.env]
      else
        @@config = open(config_path) { |f| YAML.load(f) }
      end
    rescue => e
      puts "config: #{e.message}"
      @@config = {}
    end

    @@config
  end
end
