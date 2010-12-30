var fs  = require('fs')
  , sys = require('sys')

var Configurator = function (file) {

  var self = this;
  var config = {};
  var oldConfig = {};

  this.updateConfig = function () {
    sys.log('reading config file: ' + file);

    fs.readFile(file, function (err, data) {
      if (err) { throw err; }
      old_config = self.config;

      self.config = process.compile('config = ' + data, file);
      self.emit('configChanged', self.config);
    });
  };

  this.updateConfig();

  fs.watchFile(file, function (curr, prev) {
    if (curr.ino != prev.ino) { self.updateConfig(); }
  });
};

sys.inherits(Configurator, process.EventEmitter);

exports.Configurator = Configurator;

exports.configFile = function(file, callbackFunc) {
  var config = new Configurator(file);
  config.on('configChanged', function() {
    callbackFunc(config.config, config.oldConfig);
  });
};

