/*jshint node:true  */
'use strict';

var fs  = require('fs');
var util = require('util');

var Configurator = function (file) {

  var self = this;
  this.config = {};
  this.oldConfig = {};

  this.updateConfig = function () {
    util.log('reading config file: ' + file);

    fs.readFile(file, function (err) {
      if (err) { throw err; }
      self.old_config = self.config;

      self.config = eval('self.config = ' + fs.readFileSync(file));
      self.emit('configChanged', self.config);
    });
  };

  this.updateConfig();

  fs.watch(file, function (event) {
    if (event == 'change' && self.config.automaticConfigReload !== false) {
      self.updateConfig();
    }
  });
};

util.inherits(Configurator, process.EventEmitter);

exports.Configurator = Configurator;

exports.configFile = function(file, callbackFunc) {
  var config = new Configurator(file);
  config.on('configChanged', function() {
    callbackFunc(config.config, config.oldConfig);
  });
};

