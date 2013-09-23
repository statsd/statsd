(ns statsd-client
  "a simple StatsD client written in Clojure

   Usage:
    statsd-client/increment 'foo
    statsd-client/decrement 'foo
    statsd-client/increment 'foo 1
    statsd-client/decrement 'foo 1
    statsd-client/gauge 'foo 1
    statsd-client/timing 'foo 1
  "
  (:import (java.net InetAddress DatagramPacket DatagramSocket)))

(def server-address "127.0.0.1")
(def server-port 8125)

; UDP helper functions
(defn make-socket
  ([] (new DatagramSocket))
  ([port] (new DatagramSocket port)))

(defn send-data [send-socket ip port data]
  (let [ipaddress (InetAddress/getByName ip),
        send-packet (new DatagramPacket (.getBytes data) (.length data) ipaddress port)]
  (.send send-socket send-packet)))

(defn make-send [ip port]
  (let [send-socket (make-socket)]
       (fn [data] (send-data send-socket ip port data))))

(def send-msg (make-send server-address server-port))

; statsd client functions
(defn increment
  ([metric] (increment metric 1))
  ([metric value]
    (send-msg (str metric ":" value "|c"))))

(defn decrement
  ([metric] (increment metric -1))
  ([metric value]
    (send-msg (str metric ":" value "|c"))))

(defn timing [metric value]
  (send-msg (str metric ":" value "|ms")))

(defn gauge [metric value]
  (send-msg (str metric ":" value "|g")))

