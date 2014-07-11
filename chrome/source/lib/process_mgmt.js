var util = require('util');

var conf;

exports.init = function(config) {
  conf = config;
  exports.set_title(config);

  process.on('SIGTERM', function() {
   if (conf.debug) {
     l.log('Starting Final Flush');
   }
   healthStatus = 'down';
   process.exit();
  });

}

exports.set_title = function(config) {
 if (config.title !== undefined) {
   if (config.title) {
       process.title = config.title;
   }
 } else {
   // Respect command line arguments when overriding the process title.
   cmdline = process.argv.slice(2);
   cmdline.unshift('statsd');

   process.title = cmdline.join(" ");
 }
}
