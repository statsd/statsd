require 'benchmark'
require 'eventmachine'
module Statsd
  class Graphite < EM::Connection
    attr_accessor :counters, :timers, :flush_interval
    
    def initialize(*args)
      puts args
      super
      # stuff here...
    end
    
    def post_init
      # puts counters.size
      # send_data 'Hello'
      # puts 'hello'
      # close_connection_after_writing
    end

    def receive_data(data)
      p data      
    end

    # def unbind
    #   p ' connection totally closed'
    #   EventMachine::stop_event_loop
    # end
          
    def flush_stats
      print "#{Time.now} Flushing #{counters.count} counters and #{timers.count} timers to Graphite"
      stat_string = ''
      time = ::Benchmark.realtime do
        ts = Time.now.to_i
        num_stats = 0        
        
        # store counters
        counters.each_pair do |key,value|
          value /= flush_interval
          message = "stats.#{key} #{value} #{ts}\n"
          stat_string += message
          counters[key] = 0

          num_stats += 1
        end
    
        # store timers
        timers.each_pair do |key, values|
          if (values.length > 0) 
            pct_threshold = 90
            values.sort!
            count = values.count
            min = values.first
            max = values.last

            mean = min
            max_at_threshold = max

            if (count > 1)
              # strip off the top 100-threshold
              threshold_index = (((100 - pct_threshold) / 100.0) * count).round
              values = values[0..-threshold_index]
              max_at_threshold = values.last

              # average the remaining timings
              sum = values.inject( 0 ) { |s,x| s+x }
              mean = sum / values.count
            end

            message = ""
            message += "stats.timers.#{key}.mean #{mean} #{ts}\n"
            message += "stats.timers.#{key}.upper #{max} #{ts}\n"
            message += "stats.timers.#{key}.upper_#{pct_threshold} #{max_at_threshold} #{ts}\n"
            message += "stats.timers.#{key}.lower #{min} #{ts}\n"
            message += "stats.timers.#{key}.count #{count} #{ts}\n"
            stat_string += message

            timers[key] = []
                  
            num_stats += 1
          end
        end
        stat_string += "statsd.numStats #{num_stats} #{ts}\n"
        
      end 
      # send to graphite
      send_data stat_string
      puts "complete. (#{time.round(3)}s)"
      close_connection_after_writing
    end
  end
end
