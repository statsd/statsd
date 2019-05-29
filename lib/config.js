/*jshint node:true, laxcomma:true */

const fs  = require('fs')
const util = require('util');

let Configurator = function (file) {

  let self = this;
  let config = {};
  let oldConfig = {};

  this.updateConfig = function () {
    util.log('[' + process.pid + '] reading config file: ' + file);

    fs.readFile(file, function (err, data) {
      if (err) { throw err; }
      old_config = self.config;

      self.config = eval('config = ' + data);
      self.emit('configChanged', self.config);
    });
  };

  this.updateConfig();

  fs.watch(file, function (event, filename) {
    if (event == 'change' && self.config.automaticConfigReload != false) {
      self.updateConfig();
    }
  });
};

util.inherits(Configurator, require('events').EventEmitter);

exports.Configurator = Configurator;

exports.configFile = function(file, callbackFunc) {
  let config = new Configurator(file);
  config.on('configChanged', function() {
    callbackFunc(config.config, config.oldConfig);
  });
};
