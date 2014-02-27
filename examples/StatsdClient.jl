module StatsdClient
# A simple statsd client written in Julia
# Usage:
# > using StatsdClient
# > increment("example.increment")
# > decrement("example.decrement")
# > count("example.count",8)
# > timing("example.timing",1)
# > gauge("example.gauge",123)
# > set("example.set","7623")
# Note: Requires Julia 0.3 with commit sha 6585e3de1b or later.

# Configure these to your liking
global server_config = {"server_address" => IPv4(127,0,0,1),
                        "server_port"    => 8125}

function _make_send(ip,port)
    sock = UdpSocket()
    Base.bind(sock,ip,0)
    Base.setopt(sock,enable_broadcast=1)
    (data)->send(sock,ip,port,data)
end

send_msg = _make_send(server_config["server_address"],
                      server_config["server_port"])

increment(metric) = count(metric,1)

decrement(metric) = count(metric,-1)

count(metric,value) = send_msg(string(metric,":",value,"|c"))

timing(metric,value) = send_msg(string(metric,":",value,"|ms"))

gauge(metric,value) = send_msg(string(metric,":",value,"|g"))

set(metric,value) = send_msg(string(metric,":",value,"|s"))

end
