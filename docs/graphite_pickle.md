Pickling for Graphite
=====================

The graphite statsd backend can optionally be configured to use pickle
for its over-the-wire protocol.

```javascript
    { graphiteHost: "your.graphite.host",
      graphiteProtocol: "pickle" }
```

The default is to use the graphite text protocol, which can require
more CPU processing by the graphite endpoint.

The message format expected by the graphite pickle endpoint consists
of a header and payload.

The Payload
-----------

The message payload is a list of tuples. Each tuple contains the measurement
for a single metric name. The measurement is encoded as a second,
nested tuple containing timestamp and measured value.

This ends up looking like:

```python
[ ( "path.to.metric.name", ( timestamp, "value" ) ),
  ( "path.to.another.name", ( timestamp, "value" ) ) ]
```

The graphite receiver `carbon.protocols.MetricPickleReceiver` coerces
both the timestamp and measured value into `float`.

The timestamp must be seconds since epoch encoded as a number. 

The measured value is encoded as a string. This may change in the
future.

We have chosen to not implement pickle's object memoization. This
simplifies what is sent across the wire. It is not likely any
optimization would result within a single poll cycle.

Here is some Python code showing how a given set of metrics can be
serialized in a more simple way.

```python
import pickle

metrics = [ ( "a.b.c", ( 1234L, "5678" ) ), ( "d.e.f.g", ( 1234L, "9012" ) ) ]
pickle.dumps(metrics)
# "(lp0\n(S'a.b.c'\np1\n(L1234L\nS'5678'\np2\ntp3\ntp4\na(S'd.e.f.g'\np5\n(L1234L\nS'9012'\np6\ntp7\ntp8\na."

payload = "(l(S'a.b.c'\n(L1234L\nS'5678'\ntta(S'd.e.f.g'\n(L1234L\nS'9012'\ntta."
pickle.loads(payload)
# [('a.b.c', (1234L, '5678')), ('d.e.f.g', (1234L, '9012'))]
```

The trailing `L` for long fields is unnecessary, but we are adding the
character to match Python pickle output. It's a side-effect of
`repr(long(1234))`.

The Header
----------

The message header is a 32-bit integer sent over the wire as
four-bytes. This integer must describe the length of the pickled
payload.

Here is some sample code showing how to construct the message header
containing the payload length.

```python
import struct

payload_length = 81
header = struct.pack("!L", payload_length)
# '\x00\x00\x00Q'
```

The `Q` character is equivalent to `\x81` (ASCII encoding).
