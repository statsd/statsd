require 'eventmachine'
require 'statsd'
require 'statsd/server'
require 'statsd/mongo'
require 'statsd/graphite'

require 'yaml'
require 'erb'
ROOT = File.expand_path(File.dirname(__FILE__))
APP_CONFIG = YAML::load(ERB.new(IO.read(File.join(ROOT,'config.yml'))).result)

# Setup retention store
db = Mongo::Connection.new(APP_CONFIG['mongo_host']).db(APP_CONFIG['mongo_database'])
APP_CONFIG['retentions'].each do |retention|
  collection_name = retention['name']
  unless db.collection_names.include?(collection_name)
    db.create_collection(collection_name, :capped => retention['capped'], :size => retention['cap_bytes']) 
  end
  db.collection(collection_name).ensure_index([['ts', Mongo::ASCENDING]])
end

# Start the server
Statsd::Mongo.hostname = APP_CONFIG['mongo_host']
Statsd::Mongo.database = APP_CONFIG['mongo_database']
Statsd::Mongo.retentions = APP_CONFIG['retentions']
Statsd::Mongo.flush_interval = APP_CONFIG['flush_interval']
EventMachine::run do
  EventMachine::open_datagram_socket('127.0.0.1', 8125, Statsd::Server)  
  EventMachine::add_periodic_timer(APP_CONFIG['flush_interval']) do
     counters,timers = Statsd::Server.get_and_clear_stats!
     
     #
     # Flush Adapters
     #
     # Mongo
     # EM.defer do 
     #   Statsd::Mongo.flush_stats(counters,timers)
     # end
     #
     
     # Graphite
     EventMachine.connect APP_CONFIG['graphite_host'], APP_CONFIG['graphite_port'], Statsd::Graphite do |conn|
       conn.counters = counters
       conn.timers = timers
       conn.flush_interval = 10
       conn.flush_stats
     end     
  end
  
  
end