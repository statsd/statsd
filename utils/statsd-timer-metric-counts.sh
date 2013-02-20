#!/bin/bash
# is your statsd machine maxing out cpu? ... unable to pull udp packets out of the buffer
# at a fast enough rate? (see `netstat -su` ) timer metrics are by far the most cpu intensive
# and tuning the sampling of those is key to keeping cpu load under control.
# this tool (to be run on your graphite server) shows for all your timing metric keys how many packets
# it accepted in a given interval like 1hour. using this information you can make informed decisions as
# to which keys to sample and how much.
# note that in some bad cases you might see no effect after increasing your amount of sampling, the explanation is
# that you were first sending so many packets of which only a fraction were being processed and shown in these counts, 
# that even after sampling more statsd still can't process them all and your count stays in the same range.

graphite_url=http://<your graphite url>
whisper_dir=/var/lib/carbon/whisper
timers_subdir=stats/timers

# you may want to adjust this function according to the characteristics of your environment
# I wish whisper-fetch.py supported the same function API as the http endpoint does, then I could avoid http here.
function get_indicative_count () {
    metric=$1
    url=$graphite_url'/render/?from=-1h&target=summarize('$metric',%221hour%22,%22sum%22)&format=csv'
    wget -q "$url" -O - | tail -n -1 | sed 's#.*,##' # yields a number ending with .0 or whitespace if values were None
}

function list_timer_count_files () {
    find "$whisper_dir/$timers_subdir" -name 'count.wsp' | sed -e "s#$whisper_dir/\($timers_subdir/.*/count\).wsp#\1#" -e 's#/#.#g'
}

function list_timer_counts () {
    for metric in $(list_timer_count_files); do
        echo "$metric $(get_indicative_count $metric)"
    done
}
list_timer_counts | grep 'count .*\.0' | sort -n -k2
