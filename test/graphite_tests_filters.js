var fs       = require('fs'),
    net      = require('net'),
    temp     = require('temp'),
    spawn    = require('child_process').spawn,
    util     = require('util'),
    urlparse = require('url').parse,
    _        = require('underscore'),
    dgram    = require('dgram'),
    qsparse  = require('querystring').parse,
    http     = require('http');


var writeconfig = function(text, worker, cb, obj){
  temp.open({suffix: '-statsdconf.js'}, function(err, info) {
    if (err) throw err;
    fs.writeSync(info.fd, text);
    fs.close(info.fd, function(err) {
      if (err) throw err;
      worker(info.path, cb, obj);
    });
  });
}

var statsd_send = function(data,sock,host,port,cb){
  send_data = new Buffer(data);
  sock.send(send_data,0,send_data.length,port,host,function(err,bytes){
    if (err) {
      throw err;
    }
    cb();
  });
}

// keep collecting data until a specified timeout period has elapsed
// this will let us capture all data chunks so we don't miss one
var collect_for = function(server,timeout,cb){
  var received = [];
  var in_flight = 0;
  var timed_out = false;
  var collector = function(req,res){
    in_flight += 1;
    var body = '';
    req.on('data',function(data){ body += data; });
    req.on('end',function(){
      received = received.concat(body.split("\n"));
      in_flight -= 1;
      if((in_flight < 1) && timed_out){
        server.removeListener('request',collector);
        cb(received);
      }
    });
  }

  setTimeout(function (){
    timed_out = true;
    if((in_flight < 1)) {
      server.removeListener('connection',collector);
      cb(received);
    }
  },timeout);

  server.on('connection',collector);
}
module.exports = {
  setUp: function (callback) {
    this.testport = 31337;
    this.myflush = 200;
    var configfile = "{graphService: \"graphite\"\n\
               ,  batch: 200 \n\
               ,  flushInterval: " + this.myflush + " \n\
               ,  percentThreshold: 90\n\
               ,  calculatedTimerMetrics: ['count_ps', 'count', 'count_percent', 'mean_percent', 'histogram']\n\
               ,  histogram: [ { metric: \"a_test_value\", bins: [1000] } ]\n\
               ,  port: 8125\n\
               ,  dumpMessages: false \n\
               ,  debug: false\n\
               ,  graphite: { legacyNamespace: false }\n\
               ,  graphitePort: " + this.testport + "\n\
               ,  graphiteHost: \"127.0.0.1\"}";

    this.acceptor = net.createServer();
    this.acceptor.listen(this.testport);
    this.sock = dgram.createSocket('udp4');

    this.server_up = true;
    this.ok_to_die = false;
    this.exit_callback_callback = process.exit;

    writeconfig(configfile,function(path, cb, obj){
      obj.path = path;
      obj.server = spawn('node',['stats.js', path]);
      obj.exit_callback = function (code) {
        obj.server_up = false;
        if(!obj.ok_to_die){
          console.log('node server unexpectedly quit with code: ' + code);
          process.exit(1);
        }
        else {
          obj.exit_callback_callback();
        }
      };
      obj.server.on('exit', obj.exit_callback);
      obj.server.stderr.on('data', function (data) {
        console.log('stderr: ' + data.toString().replace(/\n$/,''));
      });
      /*
      obj.server.stdout.on('data', function (data) {
        console.log('stdout: ' + data.toString().replace(/\n$/,''));
      });
      */
      obj.server.stdout.on('data', function (data) {
        // wait until server is up before we finish setUp
        if (data.toString().match(/server is up/)) {
          cb();
        }
      });

    },callback,this);
  },
  tearDown: function (callback) {
    this.sock.close();
    this.acceptor.close();
    this.ok_to_die = true;
    if(this.server_up){
      this.exit_callback_callback = callback;
      this.server.kill();
    } else {
      callback();
    }
  },

  timers_are_valid: function (test) {
    test.expect(11);

    var testvalue = 100;
    var me = this;
    this.acceptor.once('connection', function(c){
      statsd_send('a_test_value:' + testvalue + '|ms',me.sock,'127.0.0.1',8125,function(){
        collect_for(me.acceptor,me.myflush*2,function(strings){
          test.ok(strings.length > 0,'should receive some data');
          var hashes = _.map(strings, function(x) {
            var chunks = x.split(' ');
            var data = {};
            data[chunks[0]] = chunks[1];
            return data;
          });
          var numstat_test = function(post){
            var mykey = 'stats.statsd.numStats';
            return _.include(_.keys(post),mykey) && (post[mykey] == 5);
          };
          test.ok(_.any(hashes,numstat_test), 'stats.statsd.numStats should be 5');

          var testtimervalue_test = function(post){
            var mykey = 'stats.timers.a_test_value.mean_90';
            return _.include(_.keys(post),mykey) && (post[mykey] == testvalue);
          };
          var testtimerhistogramvalue_test = function(post){
            var mykey = 'stats.timers.a_test_value.histogram.bin_1000';
            return _.include(_.keys(post),mykey) && (post[mykey] == 1);
          };
          test.ok(_.any(hashes,testtimerhistogramvalue_test), 'stats.timers.a_test_value.histogram.bin_1000 should be 1');
          test.ok(_.any(hashes,testtimervalue_test), 'stats.timers.a_test_value.mean_90 should be ' + testvalue);

          var count_test = function(post, metric){
            var mykey = 'stats.timers.a_test_value.' + metric;
            return _.first(_.filter(_.pluck(post, mykey), function (e) { return e; }));
          };
          test.equals(count_test(hashes, 'count_ps'), 5, 'count_ps should be 5');
          test.equals(count_test(hashes, 'count'), 1, 'count should be 1');
          test.equals(count_test(hashes, 'count_90'), 1, 'count_90 should be 1');
          test.equals(count_test(hashes, 'sum'), null, 'sum should be null');
          test.equals(count_test(hashes, 'sum_squares'), null, 'sum_squares should be null');
          test.equals(count_test(hashes, 'sum_90'), null, 'sum_90 should be null');
          test.equals(count_test(hashes, 'sum_squares_90'), null, 'sum_squares_90 should be null');
          test.done();
        });
      });
    });
  },
}
