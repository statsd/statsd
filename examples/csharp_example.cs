using System;
using System.Linq;
using System.Net.Sockets;
using System.Text;

namespace Statsd
{
    public class StatsdPipe : IDisposable
    {
        private readonly UdpClient udpClient;

        [ThreadStatic]
        private static Random random;

        private static Random Random
        {
            get
            {
                return random ?? (random = new Random());
            }
        }

        public StatsdPipe(string host, int port)
        {
            udpClient = new UdpClient(host, port);
        }
        
        public bool Gauge(string key, int value)
        {
            return Gauge(key, value, 1.0);
        }

        public bool Gauge(string key, int value, double sampleRate)
        {
            return Send(sampleRate, String.Format("{0}:{1:d}|g", key, value));
        }

        public bool Timing(string key, int value)
        {
            return Timing(key, value, 1.0);
        }

        public bool Timing(string key, int value, double sampleRate)
        {
            return Send(sampleRate, String.Format("{0}:{1:d}|ms", key, value));
        }

        public bool Decrement(string key)
        {
            return Increment(key, -1, 1.0);
        }

        public bool Decrement(string key, int magnitude)
        {
            return Decrement(key, magnitude, 1.0);
        }

        public bool Decrement(string key, int magnitude, double sampleRate)
        {
            magnitude = magnitude < 0 ? magnitude : -magnitude;
            return Increment(key, magnitude, sampleRate);
        }

        public bool Decrement(params string[] keys)
        {
            return Increment(-1, 1.0, keys);
        }

        public bool Decrement(int magnitude, params string[] keys)
        {
            magnitude = magnitude < 0 ? magnitude : -magnitude;
            return Increment(magnitude, 1.0, keys);
        }

        public bool Decrement(int magnitude, double sampleRate, params string[] keys)
        {
            magnitude = magnitude < 0 ? magnitude : -magnitude;
            return Increment(magnitude, sampleRate, keys);
        }

        public bool Increment(string key)
        {
            return Increment(key, 1, 1.0);
        }

        public bool Increment(string key, int magnitude)
        {
            return Increment(key, magnitude, 1.0);
        }

        public bool Increment(string key, int magnitude, double sampleRate)
        {
            string stat = String.Format("{0}:{1}|c", key, magnitude);
            return Send(stat, sampleRate);
        }

        public bool Increment(int magnitude, double sampleRate, params string[] keys)
        {
            return Send(sampleRate, keys.Select(key => String.Format("{0}:{1}|c", key, magnitude)).ToArray());
        }

        protected bool Send(String stat, double sampleRate)
        {
            return Send(sampleRate, stat);
        }

        protected bool Send(double sampleRate, params string[] stats)
        {
            var retval = false; // didn't send anything
            if (sampleRate < 1.0)
            {
                foreach (var stat in stats)
                {
                    if (Random.NextDouble() <= sampleRate)
                    {
                        var statFormatted = String.Format("{0}|@{1:f}", stat, sampleRate);
                        if (DoSend(statFormatted))
                        {
                            retval = true;
                        }
                    }
                }
            }
            else
            {
                foreach (var stat in stats)
                {
                    if (DoSend(stat))
                    {
                        retval = true;
                    }
                }
            }

            return retval;
        }

        protected bool DoSend(string stat)
        {
            var data = Encoding.Default.GetBytes(stat + "\n");

            udpClient.Send(data, data.Length);
            return true;
        }

        #region IDisposable Members

        public void Dispose()
        {
            try
            {
                if (udpClient != null)
                {
                    udpClient.Close();
                }
            }
            catch
            {
            }
        }

        #endregion
    }
}
