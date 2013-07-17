package Etsy::StatsD;
use strict;
use warnings;
use IO::Socket;
use Carp;

our $VERSION = 1.000002;

=head1 NAME

Etsy::StatsD - Object-Oriented Client for Etsy's StatsD Server

=head1 DESCRIPTION

=cut

=over

=item new (HOST, PORT, SAMPLE_RATE)

Create a new instance.

=cut

sub new {
	my ( $class, $host, $port, $sample_rate ) = @_;
	$host = 'localhost' unless defined $host;
	$port = 8125        unless defined $port;

	my $sock = new IO::Socket::INET(
		PeerAddr => $host,
		PeerPort => $port,
		Proto    => 'udp',
	) or croak "Failed to initialize socket: $!";

	bless { socket => $sock, sample_rate => $sample_rate }, $class;
}

=item timing(STAT, TIME, SAMPLE_RATE)

Log timing information

=cut

sub timing {
	my ( $self, $stat, $time, $sample_rate ) = @_;
	$self->send( { $stat => "$time|ms" }, $sample_rate );
}

=item increment(STATS, SAMPLE_RATE)

Increment one of more stats counters.

=cut

sub increment {
	my ( $self, $stats, $sample_rate ) = @_;
	$self->update( $stats, 1, $sample_rate );
}

=item decrement(STATS, SAMPLE_RATE)

Decrement one of more stats counters.

=cut

sub decrement {
	my ( $self, $stats, $sample_rate ) = @_;
	$self->update( $stats, -1, $sample_rate );
}

=item update(STATS, DELTA, SAMPLE_RATE)

Update one of more stats counters by arbitrary amounts.

=cut

sub update {
	my ( $self, $stats, $delta, $sample_rate ) = @_;
	$delta = 1 unless defined $delta;
	my %data;
	if ( ref($stats) eq 'ARRAY' ) {
		%data = map { $_ => "$delta|c" } @$stats;
	}
	else {
		%data = ( $stats => "$delta|c" );
	}
	$self->send( \%data, $sample_rate );
}

=item send(DATA, SAMPLE_RATE)

Sending logging data; implicitly called by most of the other methods.

=back

=cut

sub send {
	my ( $self, $data, $sample_rate ) = @_;
	$sample_rate = $self->{sample_rate} unless defined $sample_rate;

	my $sampled_data;
	if ( defined($sample_rate) and $sample_rate < 1 ) {
		while ( my ( $stat, $value ) = each %$data ) {
			$sampled_data->{$stat} = "$value|\@$sample_rate" if rand() <= $sample_rate;
		}
	}
	else {
		$sampled_data = $data;
	}

	return '0 but true' unless keys %$sampled_data;

	#failures in any of this can be silently ignored
	my $count  = 0;
	my $socket = $self->{socket};
	while ( my ( $stat, $value ) = each %$sampled_data ) {
		_send_to_sock($socket, "$stat:$value\n");
		++$count;
	}
	return $count;
}

sub _send_to_sock( $$ ) {
  my ($sock,$msg) = @_;
  CORE::send( $sock, $msg, 0 );
}

=head1 SEE ALSO

L<http://codeascraft.etsy.com/2011/02/15/measure-anything-measure-everything/>

=head1 AUTHOR

Steve Sanbeg L<http://www.buzzfeed.com/stv>

=cut

1;
