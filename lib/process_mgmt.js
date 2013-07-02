var util = require('util');

var conf;

exports.init = function(config) {
  conf = config;
  exports.set_title(config);

  process.on('SIGTERM', function() {
   if (conf.debug) {
     util.log('Starting Final Flush');
   }
   healthStatus = 'down';
   process.exit();
  });

}

exports.set_title = function(config) {
 if (config.title !== undefined) {
   if (config.title) {
     if (process.title.length >= config.title.length) {
       process.title = config.title;
     } else {
       // check that conf is defined so we don't error in tests
       if (conf !== undefined && conf.debug) {
         util.log("config.title is to long, needs to be less than or equal to" + process.title.length);
       }
     }
   }
 } else {
   process.title = 'statsd';
 }
}
