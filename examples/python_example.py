# Steve Ivy <steveivy@gmail.com>
# http://monkinetic.com

from random import random
from socket import socket, AF_INET, SOCK_DGRAM

class StatsdClient(object):
    SC_TIMING = "ms"
    SC_COUNT = "c"
    SC_GAUGE = "g"
    SC_SET = "s"

    def __init__(self, host='localhost', port=8125):
        """
        Sends statistics to the stats daemon over UDP

        >>> from python_example import StatsdClient
        """
        self.addr = (host, port)

    def timing(self, stats, value):
        """
        Log timing information

        >>> client = StatsdClient()
        >>> client.timing('example.timing', 500)
        >>> client.timing(('example.timing23', 'example.timing29'), 500)
        """
        self.update_stats(stats, value, self.SC_TIMING)

    def gauge(self, stats, value):
        """
        Log gauges

        >>> client = StatsdClient()
        >>> client.gauge('example.gauge', 47)
        >>> client.gauge(('example.gauge41', 'example.gauge43'), 47)
        """
        self.update_stats(stats, value, self.SC_GAUGE)

    def set(self, stats, value):
        """
        Log set

        >>> client = StatsdClient()
        >>> client.set('example.set', "set")
        >>> client.set(('example.set61', 'example.set67'), "2701")
        """
        self.update_stats(stats, value, self.SC_SET)

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

    def count(self, stats, value, sample_rate=1):
        """
        Updates one or more stats counters by arbitrary value

        >>> client = StatsdClient()
        >>> client.count('example.counter', 17)
        """
        self.update_stats(stats, value, self.SC_COUNT, sample_rate)

    def update_stats(self, stats, value, _type, sample_rate=1):
        """
        Pipeline function that formats data, samples it and passes to send()

        >>> client = StatsdClient()
        >>> client.update_stats('example.update_stats', 73, "c", 0.9)
        """
        stats = self.format(stats, value, _type)
        self.send(self.sample(stats, sample_rate), self.addr)

    @staticmethod
    def format(keys, value, _type):
        """
        General format function.

        >>> StatsdClient.format("example.format", 2, "T")
        {'example.format': '2|T'}
        >>> StatsdClient.format(("example.format31", "example.format37"), "2", "T")
        {'example.format31': '2|T', 'example.format37': '2|T'}
        """
        data = {}
        value = "{0}|{1}".format(value, _type)
        # TODO: Allow any iterable except strings
        if not isinstance(keys, (list, tuple)):
            keys = [keys]
        for key in keys:
            data[key] = value
        return data

    @staticmethod
    def sample(data, sample_rate):
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
        if sample_rate >= 1:
            return data
        elif sample_rate < 1:
            if random() <= sample_rate:
                sampled_data = {}
                for stat, value in data.items():
                    sampled_data[stat] = "{0}|@{1}".format(value, sample_rate)
                return sampled_data
        return {}

    @staticmethod
    def send(_dict, addr):
        """
        Sends key/value pairs via UDP.

        >>> StatsdClient.send({"example.send":"11|c"}, ("127.0.0.1", 8125))
        """
        # TODO(rbtz@): IPv6 support
        udp_sock = socket(AF_INET, SOCK_DGRAM)
        # TODO(rbtz@): Add batch support
        for item in _dict.items():
            udp_sock.sendto(":".join(item).encode('utf-8'), addr)
