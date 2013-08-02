#!/bin/bash
#
# Very simple bash client to send metrics to a statsd server
# Example with gauge:  ./statsd-client.sh 'my_metric:100|g'
#
# Alexander Fortin <alexander.fortin@gmail.com>
#
host="${STATSD_HOST:-127.0.0.1}"
port="${STATSD_PORT:-8125}"

if [ $# -ne 1 ]
then
  echo "Syntax: $0 '<gauge_data_for_statsd>'"
  exit 1
fi

# Setup UDP socket with statsd server
exec 3<> /dev/udp/$host/$port

# Send data
printf "$1" >&3

# Close UDP socket
exec 3<&-
exec 3>&-
