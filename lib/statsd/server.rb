require 'eventmachine'
module Statsd
  module Server #< EM::Connection  
    Version = '0.0.4'  
    
    FLUSH_INTERVAL = 10
    COUNTERS = {}
    TIMERS = {}
    def post_init
      puts "statsd server started!"
    end
    def self.get_and_clear_stats!
      counters = COUNTERS.dup
      timers = TIMERS.dup
      COUNTERS.clear
      TIMERS.clear
      [counters,timers]
    end
    def receive_data(msg)    
      msg.split("\n").each do |row|
        # puts row
        bits = row.split(':')
        key = bits.shift.gsub(/\s+/, '_').gsub(/\//, '-').gsub(/[^a-zA-Z_\-0-9\.]/, '')
        bits.each do |record|
          sample_rate = 1
          fields = record.split("|")    
          if (fields[1].strip == "ms") 
            TIMERS[key] ||= []
            TIMERS[key].push(fields[0].to_i)
          else
            if (fields[2] && fields[2].match(/^@([\d\.]+)/)) 
              sample_rate = fields[2].match(/^@([\d\.]+)/)[1]
            end
            COUNTERS[key] ||= 0
            COUNTERS[key] += (fields[0].to_i || 1) * (1.0 / sample_rate.to_f)
          end
        end
      end
    end    
  end 
end