#!/bin/bash
#
# Very simple bash client to send gauge metrics to a statsd client
# Example: ./statsd-client.sh 'my_metric:100'
#
# Alexander Fortin <alexander.fortin@gmail.com>
#
STATSD="statsd-ip-address"
PORT="8125"

if [ $# -ne 1 ]
then
  echo "Syntax: $0 '<gauge_data_for_statsd>'"
  exit 1
fi

# Setup UDP socket with statsd server
exec 3<> /dev/udp/${STATSD}/${PORT}

# Send data
echo "$1|g" >&3

# Close UDP socket
exec 3<&-
exec 3>&-
