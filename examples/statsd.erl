%%
%% Example erlang client implementation for the Etsy statsd
%%
%% Copyright (c) 2011-2012 Daniel Schauenberg, Sean Johnson
%%
%% Permission is hereby granted, free of charge, to any person
%% obtaining a copy of this software and associated documentation
%% files (the "Software"), to deal in the Software without
%% restriction, including without limitation the rights to use,
%% copy, modify, merge, publish, distribute, sublicense, and/or sell
%% copies of the Software, and to permit persons to whom the
%% Software is furnished to do so, subject to the following
%% conditions:
%%
%% The above copyright notice and this permission notice shall be
%% included in all copies or substantial portions of the Software.
%%
%% THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
%% EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
%% OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
%% NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
%% HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
%% WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
%% FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
%% OTHER DEALINGS IN THE SOFTWARE.
%%
%% Implements the following functions:
%%   increment(Stat) -> Increment the counter for the Stat by 1 with a 1.0 Sample Rate.
%%   increment(Stat, Amount) -> Increment the counter by the Amount for the Stat with a 1.0 Sample Rate.
%%   increment(Stat, Amount, SampleRate) -> Increment the counter for Stat by the Amount with the Sample Rate.
%%   decrement(Stat) -> Decrement the counter for the Stat by 1 with a 1.0 Sample Rate.
%%   decrement(Stat, Amount) -> Decrement the counter by the Amount for the Stat with a 1.0 Sample Rate.
%%   decrement(Stat, Amount, SampleRate) -> Decrement the counter for Stat by the Amount with the Sample Rate.
%%   timing(Stat, Time) -> Record a Time for the Stat with a 1.0 Sample Rate.
%%   timing(Stat, Time, SampleRate) -> Record Time for the Stat with the Sample Rate.
%%   gauge(Stat, Reading) -> Record a Reading of the Stat
%%
%% Run tests with:
%%   Run statsd with the parameters set in the -defines()
%%   % erlc -pa /path/to/eunit/ebin -DTEST -o.statsd.erl
%%   % erl -noshell -pa. -eval "eunit:test(statsd, [verbose])" -s init stop
%%
%%
-module(statsd).
% Meta information
-author("Daniel Schauenberg <d@unwiredcouch.com>").
-author("Sean Johnson <sean@talkto.com>").
% defines
-define(HOST, "localhost").
-define(PORT, 8125).
% exports
-export([increment/1,increment/2,increment/3,
         decrement/1, decrement/2, decrement/3,
         timing/2, timing/3,
         gauge/2]).

%
% API functions
%

% functions for incrementing counters
increment(Stat) -> increment(Stat, 1, 1.0).
increment(Stat, Delta) when is_integer(Delta) ->
  increment(Stat, Delta, 1.0);
increment(Stat, Samplerate) when is_float(Samplerate) ->
  increment(Stat, 1, Samplerate).
increment(Stat, Delta, Samplerate) when is_integer(Delta), is_float(Samplerate) ->
  send({counter, Stat, Delta, Samplerate}).

% functions for decrementing counters
decrement(Stat) -> decrement(Stat, 1, 1.0).
decrement(Stat, Delta) when is_integer(Delta) ->
  decrement(Stat, Delta, 1.0);
decrement(Stat, Samplerate) when is_float(Samplerate) ->
  decrement(Stat, 1, Samplerate).
decrement(Stat, Delta, Samplerate) when is_integer(Delta), is_float(Samplerate) ->
  send({counter, Stat, -abs(Delta), Samplerate}).

% functions for timing values
timing(Stat, Time) when is_float(Time); is_integer(Time) ->
  timing(Stat, Time, 1.0).
timing(Stat, Time, Samplerate) when is_float (Time); is_integer(Time),
                                    is_float(Samplerate) ->
  send({timer, Stat, Time, Samplerate}).

% functions for guages
gauge(Stat, Reading) ->
  send({gauge, Stat, Reading}).

%
% update functions
%

% recursive functions for multiple stats
send({counter, [H|Stats], Delta, Samplerate}) ->
  send({counter, H, Delta, Samplerate}),
  send({counter, Stats, Delta, Samplerate});
send({counter, [], _, _}) -> {ok, "Success."};

send({timer, [H|Stats], Delta, Samplerate}) ->
  send({timer, H, Delta, Samplerate}),
  send({timer, Stats, Delta, Samplerate});
send({timer, [], _, _}) -> {ok, "Success."};

send({gauge, [H|Stats], Reading}) ->
  send({gauge, H, Reading}),
  send({gauge, Stats, Reading});
send({gauge, [], _}) -> {ok, "Success."};

% functions for single stats
send({counter, Stat, Delta, Samplerate}) when Samplerate < 1.0, is_atom(Stat) ->
  Rand = random:uniform(),
  if
    Rand =< Samplerate ->
      send_udp_message(?HOST, ?PORT, io_lib:format("~p:~p|c|@~p",
                                                   [Stat, Delta, Samplerate]));
    true -> {ok, "Success."}
  end;

send({counter, Stat, Delta, _}) ->
  send_udp_message(?HOST, ?PORT, io_lib:format("~p:~p|c", [Stat, Delta]));

send({timer, Stat, Time, Samplerate}) when Samplerate < 1.0 ->
  Rand = random:uniform(),
  if
    Rand =< Samplerate ->
      send_udp_message(?HOST, ?PORT, io_lib:format("~p:~p|ms|@~p",
                                                   [Stat, Time, Samplerate]));
    true -> {ok, "Success."}
  end;

send({timer, Stat, Time, _}) ->
  send_udp_message(?HOST, ?PORT, io_lib:format("~p:~p|ms", [Stat, Time]));

send({gauge, Stat, Reading}) ->
  send_udp_message(?HOST, ?PORT, io_lib:format("~p:~p|g", [Stat, Reading])).

%
% Raw UDP send message function
%
send_udp_message(Host, Port, Msg) when is_integer(Port),
                                         is_list(Host) ->
  {ok, Socket} = gen_udp:open(0, [binary]),
  ok = gen_udp:send(Socket, Host, Port, Msg),
  gen_udp:close(Socket),
  {ok, "Success."}.

%
% unit tests
%
% EUnit headers
-ifdef(TEST).
-include_lib("eunit/include/eunit.hrl").
% test functions go here
increment_test_() ->
  [?_assert(increment(stat1) =:= {ok, "Success."}),
   ?_assert(increment(stat1, 1) =:= {ok, "Success."}),
   ?_assert(increment(stat1, 1, 0.5) =:= {ok, "Success."}),
   ?_assert(increment([stat1, stat2]) =:= {ok, "Success."}),
   ?_assert(increment([stat1, stat2], 1) =:= {ok, "Success."}),
   ?_assert(increment([stat1, stat2], 1, 0.5) =:= {ok, "Success."})
       ].
decrement_test_() ->
  [?_assert(decrement(stat1) =:= {ok, "Success."}),
   ?_assert(decrement(stat1, 1) =:= {ok, "Success."}),
   ?_assert(decrement(stat1, -1) =:= {ok, "Success."}),
   ?_assert(decrement(stat1, 1, 0.5) =:= {ok, "Success."}),
   ?_assert(decrement([stat1, stat2]) =:= {ok, "Success."}),
   ?_assert(decrement([stat1, stat2], 1) =:= {ok, "Success."}),
   ?_assert(decrement([stat1, stat2], -1) =:= {ok, "Success."}),
   ?_assert(decrement([stat1, stat2], 1, 0.5) =:= {ok, "Success."})
       ].
timing_test_() ->
  [
   ?_assert(timing(stat1, 100) =:= {ok, "Success."}),
   ?_assert(timing(stat1, 100, 0.5) =:= {ok, "Success."}),
   ?_assert(timing([stat1, stat2], 100) =:= {ok, "Success."}),
   ?_assert(timing([stat1, stat2], 100, 0.5) =:= {ok, "Success."})
       ].
gauge_test_() ->
 [
  ?_assert(gauge(stat1, 100) =:= {ok, "Success."}),
  ?_assert(gauge([stat1, stat2], 100) =:= {ok, "Success."})
      ].

-endif.