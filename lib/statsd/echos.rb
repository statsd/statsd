#!/usr/bin/env ruby
#

require 'rubygems'
require 'eventmachine'

module EchoServer
  def post_init
    puts "-- someone connected to the server!"
  end

  def receive_data data
    puts data
    send_data ">>> you sent: #{data}"
  end
end

EventMachine::run {
  EventMachine::start_server "127.0.0.1", 8125, EchoServer
  puts 'running dummy graphite echo server on 8125'
}