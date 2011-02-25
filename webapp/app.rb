require 'rubygems'
require 'sinatra'
require 'mongo'
require 'yaml'
ROOT = File.expand_path(File.dirname(__FILE__))
APP_CONFIG = YAML::load(ERB.new(IO.read(File.join(ROOT,'config.yml'))).result)
get '/' do
  db = Mongo::Connection.new(APP_CONFIG['dbhost']).db(APP_CONFIG['db'])
  coll = db.collection("stats_10s")
  @stats = coll.find({}).limit(100)
  erb :chart
end