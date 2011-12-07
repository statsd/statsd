# python_example.py

# Steve Ivy <steveivy@gmail.com>
# http://monkinetic.com
 
# this file expects local_settings.py to be in the same dir, with statsd host and port information:
# 
# statsd_host = 'localhost'
# statsd_port = 8125

# Sends statistics to the stats daemon over UDP
class Statsd(object):
    
    @classmethod
    def timing(cls, stat, time, sample_rate=1):
        """
        Log timing information
        >>> from python_example import Statsd
        >>> Statsd.timing('some.time', 500)
        """
        stats = {}
        stats[stat] = "%d|ms" % time
        cls.send(stats, sample_rate)

    @classmethod
    def increment(cls, stats, sample_rate=1):
        """
        Increments one or more stats counters
        >>> Statsd.increment('some.int')
        >>> Statsd.increment('some.int',0.5)
        """
        cls.update_stats(stats, 1, sample_rate)

    @classmethod
    def decrement(cls, stats, sample_rate=1):
        """
        Decrements one or more stats counters
        >>> Statsd.decrement('some.int')
        """
        cls.update_stats(stats, -1, sample_rate)
    
    @classmethod
    def update_stats(cls, stats, delta=1, sampleRate=1):
        """
        Updates one or more stats counters by arbitrary amounts
        >>> Statsd.update_stats('some.int',10)
        """
        if (type(stats) is not list):
            stats = [stats]
        data = {}
        for stat in stats:
            data[stat] = "%s|c" % delta

        cls.send(data, sampleRate)
    
    @classmethod
    def send(cls, data, sample_rate=1):
        """
        Squirt the metrics over UDP
        """
        try:
            import local_settings as settings
            host = settings.statsd_host
            port = settings.statsd_port
            addr=(host, port)
        except Error:
            exit(1)
        
        sampled_data = {}
        
        if(sample_rate < 1):
            import random
            if random.random() <= sample_rate:
                for stat in data.keys():
                    value = data[stat]
                    sampled_data[stat] = "%s|@%s" %(value, sample_rate)
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