#!/bin/bash
#
# Very simple bash client to send metrics to a statsd server
# Example with gauge:  ./statsd-client.sh 'my_metric:100|g'
#
# Alexander Fortin <alexander.fortin@gmail.com>
#
STATSD="127.0.0.1"
PORT="8125"

if [ $# -ne 1 ]
then
  echo "Syntax: $0 '<gauge_data_for_statsd>'"
  exit 1
fi

# Setup UDP socket with statsd server
exec 3<> /dev/udp/${STATSD}/${PORT}

# Send data
echo -n "$1" >&3

# Close UDP socket
exec 3<&-
exec 3>&-
