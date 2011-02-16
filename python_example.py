# python_example.py

# Steve Ivy <steveivy@gmail.com>
# http://monkinetic.com
 
# this file expects local_settings.py to be in the same dir, with statsd host and port information:
# 
# statsd_host = 'localhost'
# statsd_port = 8125

# Sends statistics to the stats daemon over UDP
class Statsd(object):
    
    # Log timing information
    @staticmethod
    def timing(stats, time, sample_rate=1):
        Statsd.update_stats(stats, time, sample_rate)

    # Increments one or more stats counters
    @staticmethod
    def increment(stats, sample_rate=1):
        Statsd.update_stats(stats, 1, sample_rate)

    # Decrements one or more stats counters
    @staticmethod
    def decrement(stats, sample_rate=1):
        Statsd.update_stats(stats, -1, sample_rate)
    
    # Updates one or more stats counters by arbitrary amounts
    @staticmethod
    def update_stats(stats, delta=1, sampleRate=1):
        if (type(stats) is not list):
            stats = [stats]
        data = {}
        for stat in stats:
            data[stat] = "%s|c" % delta

        Statsd.send(data, sampleRate)
    
    # Squirt the metrics over UDP
    @staticmethod
    def send(data, sample_rate=1):
        
        try:
            import local_settings as settings
            host = settings.statsd_host
            port = settings.statsd_port
            addr=(host, port)
        except Error:
            exit(1)
        
        sampled_data = []
        
        if(sample_rate < 1):
            pass
        #     for (stat in data.keys):
        #         value = data[stat]
        else:
            sampled_data=data
        
        from socket import *
        udp_sock = socket(AF_INET, SOCK_DGRAM)
        try:
            for stat in sampled_data.keys():
                value = data[stat]
                send_data = "%s:%s" % (stat, value)
                udp_sock.sendto(send_data, addr)
        except:
            import sys
            from pprint import pprint
            print "Unexpected error:", pprint(sys.exc_info())
            pass # we don't care