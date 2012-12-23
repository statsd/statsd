# python_example.py

# Steve Ivy <steveivy@gmail.com>
# http://monkinetic.com

from __future__ import print_function
from random import random
from socket import socket, AF_INET, SOCK_DGRAM

class StatsdClient(object):
    def __init__(self, host='localhost', port=8125):
        """
        Sends statistics to the stats daemon over UDP

        >>> from python_example import StatsdClient
        """
        self.addr = (host, port)

    def timing(self, stat, time):
        """
        Log timing information

        >>> client = StatsdClient()
        >>> client.timing('example.timing', 500)
        """
        stats = {}
        stats[stat] = "{0}|ms".format(time)
        self.send(stats, self.addr)

    def increment(self, stats, sample_rate=1):
        """
        Increments one or more stats counters

        >>> client = StatsdClient()
        >>> client.increment('example.increment')
        >>> client.increment('example.increment', 0.5)
        """
        self.count(stats, 1, sample_rate)

    def decrement(self, stats, sample_rate=1):
        """
        Decrements one or more stats counters

        >>> client = StatsdClient()
        >>> client.decrement('example.decrement')
        """
        self.count(stats, -1, sample_rate)

    def count(self, stats, delta, sample_rate=1):
        """
        Updates one or more stats counters by arbitrary amounts

        >>> client = StatsdClient()
        >>> client.count('example.counter', 17)
        """
        if not isinstance(stats, list):
            stats = [stats]
        data = {}
        for stat in stats:
            data[stat] = "{0}|c".format(delta)
        self.sample_send(data, sample_rate)

    def sample_send(self, data, sample_rate=1):
        """
        Sample and squirt the metrics over UDP

        >>> client = StatsdClient()
        >>> client.sample_send({"example.sample_send": "13|c"}, 1)
        True
        """
        return self.send(self.sample(data, sample_rate), self.addr)

    @staticmethod
    def sample(data, sample_rate=1):
        """
        Sample data dict
        TODO(rbtz@): Convert to generator

        >>> StatsdClient.sample({"example.sample2": "2"}, 1)
        {'example.sample2': '2'}
        >>> StatsdClient.sample({"example.sample3": "3"}, 0)
        {}
        >>> from random import seed
        >>> seed(1)
        >>> StatsdClient.sample({"example.sample5": "5", "example.sample7": "7"}, 0.99)
        {'example.sample5': '5|@0.99', 'example.sample7': '7|@0.99'}
        >>> StatsdClient.sample({"example.sample5": "5", "example.sample7": "7"}, 0.01)
        {}
        """
        sampled_data = {}
        if 0 < sample_rate < 1:
            if random() <= sample_rate:
                for stat, value in data.items():
                    sampled_data[stat] = "{0}|@{1}".format(value, sample_rate)
        elif sample_rate == 0:
            sampled_data = {}
        else:
            sampled_data = data
        return sampled_data

    @staticmethod
    def send(_dict, addr):
        """
        Sends key/value pairs via UDP.

        >>> StatsdClient.send({"example.send":"11|c"}, ("127.0.0.1", 8125))
        True
        """
        # TODO(rbtz@): IPv6 support
        udp_sock = socket(AF_INET, SOCK_DGRAM)
        try:
            # TODO(rbtz@): Add batch support
            for item in _dict.items():
                udp_sock.sendto(":".join(item).encode('utf-8'), addr)
        except Exception:
            import sys
            import traceback
            print("Unexpected error: ", traceback.format_exc(), file=sys.stderr)
            return False
        return True


if __name__=="__main__":
    c = StatsdClient()
    c.increment('example.python')
