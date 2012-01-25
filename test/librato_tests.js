var fs           = require('fs'),
    temp         = require('temp'),
    spawn        = require('child_process').spawn,
    urlparse     = require('url').parse,
    _            = require('underscore'),
    dgram        = require('dgram'),
    qsparse      = require('querystring').parse,
    http         = require('http');


var writeconfig = function(text,worker,cb,obj){
  temp.open({suffix: '-statsdconf.js'}, function(err, info) {
    if (err) throw err;
    fs.write(info.fd, text);
    fs.close(info.fd, function(err) {
      if (err) throw err;
      worker(info.path,cb,obj);
    });
  });
}

var array_contents_are_equal = function(first,second){
  var intlen = _.intersection(first,second).length;
  var unlen = _.union(first,second).length;
  return (intlen == unlen) && (intlen == first.length);
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
  var start_time = new Date().getTime();
  var collector = function(req,res){
    res.writeHead(204);
    res.end();
    in_flight += 1;
    var body = '';
    req.on('data',function(data){ body += data; });
    req.on('end',function(){
      received = received.concat(body);
      in_flight -= 1;
      if((in_flight < 1) && (new Date().getTime() > (start_time + timeout))){
          server.removeListener('request',collector);
          cb(received);
      }
    });
  }

  setTimeout(function (){
    server.removeListener('request',collector);
    if((in_flight < 1)){
      cb(received);
    }
  },timeout);

  server.on('request',collector);
}

module.exports = {
  setUp: function (callback) {
    this.testport = 31337;

    this.myflush = 200;
    var configfile = "{\n\
                  batch: 200 \n\
               ,  flushInterval: " + this.myflush + " \n\
               ,  port: 8125\n\
               ,  dumpMessages: false \n\
               ,  debug: true\n\
               ,  libratoUser: \"test@librato.com\"\n\
               ,  libratoSnap: 10\n\
               ,  libratoApiKey: \"fakekey\"\n\
               ,  libratoHost: \"http://127.0.0.1:" + this.testport + "\"}";

    this.acceptor = http.createServer();
    this.acceptor.listen(this.testport);
    this.sock = dgram.createSocket('udp4');

    this.server_up = true;
    this.ok_to_die = false;
    this.exit_callback_callback = process.exit;

    writeconfig(configfile,function(path,cb,obj){
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

  send_well_formed_posts: function (test) {
    test.expect(5);

    // we should integrate a timeout into this
    this.acceptor.once('request',function(req,res){
        res.writeHead(204);
        res.end();
        test.equals(req.method,'POST');
        var uri_parts = urlparse(req.url);
        test.equals(uri_parts["pathname"],'/v1/metrics.json')
        var body = '';
        req.on('data',function(data){ body += data; });
        req.on('end',function(){
          try {
              var post = JSON.parse(body);
          } catch (e) {
            test.ok(false,"string sent was not valid JSON: " + e);
            test.done();
            return;
          }
          test.ok(true);
          var message_keys = ['measure_time','gauges'];
          test.ok(array_contents_are_equal(_.keys(post),message_keys),"JSON must only have: [" + message_keys + "], received: [" + _.keys(post) + "]");

          if(_.include(_.keys(post),'gauges') && _.include(_.keys(post['gauges']),'numStats') &&
             _.include(_.keys(post['gauges']['numStats']),'value')){
             test.equals(post['gauges']['numStats']['value'],0);
          } else {
            test.ok('false', 'API does not send numStats properly');
          }
          test.done();
        });
    });
  },

  timers_are_valid: function (test) {
    test.expect(3);

    var testvalue = 100;
    var me = this;
    this.acceptor.once('request',function(req,res){
      res.writeHead(204);
      res.end();
      statsd_send('a_test_value:' + testvalue + '|ms',me.sock,'127.0.0.1',8125,function(){
          collect_for(me.acceptor,me.myflush*2,function(strings){
            test.ok(strings.length > 0,'should receive some data');
            var hashes = _.map(strings,function(str){ return JSON.parse(str); });
            var numstat_test = function(post){
              return _.include(_.keys(post),'gauges') && _.include(_.keys(post['gauges']),'numStats') &&
              _.include(_.keys(post['gauges']['numStats']),'value') &&
              (post['gauges']['numStats']['value'] == 1);
            };
            test.ok(_.any(hashes,numstat_test), 'numStats should be 1');

            var testvalue_test = function(post){
              return _.include(_.keys(post),'gauges') && _.include(_.keys(post['gauges']),'a_test_value') &&
              _.include(_.keys(post['gauges']['a_test_value']),'sum') &&
              (post['gauges']['a_test_value']['sum'] == testvalue);
            };
            test.ok(_.any(hashes,testvalue_test), 'testvalue should be ' + testvalue);
            test.done();
          });
      });
    });
  },

  counts_are_valid: function (test) {
    test.expect(3);

    var testvalue = 100;
    var me = this;
    this.acceptor.once('request',function(req,res){
      res.writeHead(204);
      res.end();
      statsd_send('a_test_value:' + testvalue + '|c',me.sock,'127.0.0.1',8125,function(){
          collect_for(me.acceptor,me.myflush*2,function(strings){
            test.ok(strings.length > 0,'should receive some data');
            var hashes = _.map(strings,function(str){ return JSON.parse(str); });
            var numstat_test = function(post){
              return _.include(_.keys(post),'gauges') && _.include(_.keys(post['gauges']),'numStats') &&
              _.include(_.keys(post['gauges']['numStats']),'value') &&
              (post['gauges']['numStats']['value'] == 1);
            };
            test.ok(_.any(hashes,numstat_test), 'numStats should be 1');

            var testvalue_test = function(post){
              return _.include(_.keys(post),'gauges') && _.include(_.keys(post['gauges']),'a_test_value') &&
              _.include(_.keys(post['gauges']['a_test_value']),'value') &&
              (post['gauges']['a_test_value']['value'] == testvalue);
            };
            test.ok(_.any(hashes,testvalue_test), 'testvalue should be ' + testvalue);
            test.done();
          });
      });
    });
  }
}
