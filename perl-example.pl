#! /usr/bin/perl

use strict;
use warnings;
use Getopt::Long;
use lib '.';
use Etsy::StatsD;

my %opt; 

GetOptions(\%opt, 'host=s', 'port=s', 'sample=f', 'time=f', 'increment', 'decrement', 'update=i') or die;

my $bucket = shift or die "Need to provide a bucket";

my $statsd = Etsy::StatsD->new($opt{host}, $opt{port}, $opt{rate});
if ($opt{time}) {
	$statsd->timing($bucket,$opt{time});
}
if ($opt{increment}) {
	$statsd->increment($bucket);
}
if ($opt{update}) {
	$statsd->update($bucket, $opt{update});
}
if ($opt{decrement}) {
	$statsd->decrement($bucket);
}

