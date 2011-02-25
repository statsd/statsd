require 'benchmark'
require 'mongo'
module Statsd
  class Mongo
    class << self
      attr_accessor :database, :hostname, :retentions, :flush_interval
    end

    def self.flush_stats(counters, timers)
      raise 'Invalid retention config' if retentions.empty?
      print "#{Time.now} Flushing #{counters.count} counters and #{timers.count} timers to MongoDB"
      stat_string = ''
      time = ::Benchmark.realtime do
        docs = []
        ts = Time.now.to_i
        num_stats = 0        
        retention = retentions.first # always write at the fineset granularity        
        ts_bucket = ts / retention['seconds'].to_i * retention['seconds'].to_i
        
        # connect to store
        db = ::Mongo::Connection.new(hostname).db(database)
        coll = db.collection(retention['name'])

        # store counters
        counters.each_pair do |key,value|
          value /= flush_interval
          doc = {:stat => key, :value => value, :ts => ts_bucket, :type => "counter" }
          docs.push(doc)
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

            timers[key] = []
          
            # Flush Values to Store
            doc = { :stat => key, 
              :values => {
                :mean => mean,
                :max => max,
                :min => min,
                "upper_#{pct_threshold}".to_sym => max_at_threshold,
                :count => count
              },
              :type => "timer",
              :ts => ts_bucket
            }
            docs.push(doc)
          
            num_stats += 1
          end
        end
        stat_string += "statsd.numStats #{num_stats} #{ts}\n"
        coll.insert(docs)
        
       aggregate(ts_bucket)
      end 
      puts "complete. (#{time.round(3)}s)"
    end

    # For each coarse granularity of retention
    #   Look up the previous bucket 
    #     If there is no data, aggregate the finest Fill it if empty 
    # TODO consider doing this inside Mongo with M/R
    def self.aggregate(current_bucket)
      db = ::Mongo::Connection.new(hostname).db(database)
      retentions.sort_by! {|r| r['seconds']}
      docs = []
      fine_stats_collection = db.collection(retentions.first['name']) # Use the finest granularity for now
      retentions[1..-1].each_with_index do |retention,index|
        # fine_stats_collection = db.collection(retentions[index]['name'])
        coarse_stats_collection = db.collection(retention['name'])
        step = retention['seconds']
        current_coarse_bucket = current_bucket / step * step - step
        previous_coarse_bucket = current_coarse_bucket - step
        # Look up previous bucket
        if coarse_stats_collection.find({:ts => previous_coarse_bucket}).count == 0
          # Aggregate
          print '.'
          stats_to_aggregate = fine_stats_collection.find(
            {:ts => {"$gte" => previous_coarse_bucket, "$lt" => current_coarse_bucket}})
          rows = stats_to_aggregate.to_a
          count = stats_to_aggregate.count
          rows.group_by {|r| r["stat"] }.each_pair do |name,stats|
            case stats.first['type']
            when 'timer' 
              mean = stats.collect {|stat| stat['values']['mean'] }.inject( 0 ) { |s,x| s+x } / stats.count
              max  = stats.collect {|stat| stat['values']['max'] }.max
              min  = stats.collect {|stat| stat['values']['max'] }.min
              upper_key = stats.first['values'].keys.find{|k| k =~ /upper_/}
              max_at_threshold = stats.collect {|stat| stat['values'][upper_key] }.max
              total_stats = stats.collect {|stat| stat['values']['count'] }.inject( 0 ) { |s,x| s+x }            
              doc = { :stat => name, 
                :values => {
                  :mean => mean,
                  :max => max,
                  :min => min,
                  upper_key.to_sym => max_at_threshold,
                  :count => total_stats
                },
                :type => "timer",
                :ts => previous_coarse_bucket
              }
            when 'counter'  
              doc = {:stat => name, 
                :value => stats.collect {|stat| stat['value'] }.inject( 0 ) { |s,x| s+x }, 
                :ts => previous_coarse_bucket, 
                :type => "counter"
              }
            else
              raise "unknown type #{stats.first['type']}"
            end
            docs.push(doc)
          end
          coarse_stats_collection.insert(docs)          
        end
      end
      
    end
  end
end