# python_example.py

# Steve Ivy <steveivy@gmail.com>
# http://monkinetic.com

from __future__ import print_function
from random import random
from socket import socket, AF_INET, SOCK_DGRAM

# Sends statistics to the stats daemon over UDP
class StatsdClient(object):
    def __init__(self, host='localhost', port=8125):
        self.addr = (host, port)

    def timing(self, stat, time, sample_rate=1):
        """
        Log timing information
        >>> from python_example import StatsdClient
        >>> client = StatsdClient()
        >>> client.timing('some.time', 500)
        """
        stats = {}
        stats[stat] = "{0}|ms".format(time)
        self.send(stats, sample_rate)

    def increment(self, stats, sample_rate=1):
        """
        Increments one or more stats counters
        >>> client = StatsdClient()
        >>> client.increment('some.int')
        >>> client.increment('some.int', 0.5)
        """
        self.update_stats(stats, 1, sample_rate)

    def decrement(self, stats, sample_rate=1):
        """
        Decrements one or more stats counters
        >>> client = StatsdClient()
        >>> client.decrement('some.int')
        """
        self.update_stats(stats, -1, sample_rate)

    def update_stats(self, stats, delta=1, sampleRate=1):
        """
        Updates one or more stats counters by arbitrary amounts
        >>> client = StatsdClient()
        >>> client.update_stats('some.int', 10)
        """
        if not isinstance(stats, list):
            stats = [stats]
        data = {}
        for stat in stats:
            data[stat] = "{0}|c".format(delta)
        self.send(data, sampleRate)

    def send(self, data, sample_rate=1):
        """
        Squirt the metrics over UDP
        """
        sampled_data = {}

        if (sample_rate < 1):
            if random() <= sample_rate:
                for stat, value in data.items():
                    sampled_data[stat] = "{0}|@{1}".format(value, sample_rate)
        else:
            sampled_data = data

        udp_sock = socket(AF_INET, SOCK_DGRAM)
        try:
            for stat, value in sampled_data.items():
                send_data = "{0}:{1}".format(stat, value)
                udp_sock.sendto(send_data.encode('utf-8'), self.addr)
        except Exception:
            import sys
            import traceback
            print("Unexpected error: ", traceback.format_exc(), file=sys.stderr)
            return False
        return True


if __name__=="__main__":
    c = StatsdClient()
    c.increment('example.python')
