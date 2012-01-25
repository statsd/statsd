#!/usr/bin/perl -w

## quick and dirty nagios check for statsd

use strict;
use IO::Socket;
use Getopt::Long;

use constant {
    OK   => 0,
    WARN => 1,
    CRIT => 2
};

# config defaults
my $mgmt_addr = '127.0.0.1';
my $mgmt_port = 8126;

# globals
my ($metric, $warn, $crit);

GetOptions(
    "host=s"    => \$mgmt_addr,
    "port=i"    => \$mgmt_port,
    "metric=s"  => \$metric,
    "warning=i" => \$warn,
    "crit=i"    => \$crit,
);

unless ($metric && $warn && $crit) {
    print <<USAGE;
usage: check_statsd.pl -m <metric> -w <warn> -c <crit> [-H <host>] [-P <port>]

USAGE
    exit CRIT;
}

my $handle = IO::Socket::INET->new(
    Proto    => 'tcp',
    PeerAddr => $mgmt_addr,
    PeerPort => $mgmt_port,
) || die "Couldn't open statsd management connection; $mgmt_addr:$mgmt_port";

# make stats request
print $handle "stats\r\n";

my $value;
while(<$handle>) {
    last if /END/;
    next if !/^$metric:\s+(\d+)/;
    $value = $1;
}

my ($msg, $code);
if (defined $value) {
    if ($value > $warn) {
        $msg  = "WARNING: $metric value $value exceeds warning threshold $warn";
        $code = WARN;
    }
    elsif ($value > $crit) {
        $msg  = "CRITICAL: $metric value $value exceeds critical threshold $crit";
        $code = CRIT;
    }
    else {
        $msg  = "OK: $metric = $value";
        $code = OK;
    }
}
else {
    $msg  = "CRITICAL: metric $metric wasn't found";
    $code = CRIT;
}

print $msg;
exit $code;
