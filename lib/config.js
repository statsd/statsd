/*jshint node:true, laxcomma:true */

var fs  = require('fs')
  , util = require('util')
  , EventEmitter = require('events').EventEmitter;

function Configurator (file) {
  EventEmitter.call(this);

  this.file = file;
  this.config = {};
  this.oldConfig = {};
  this.updateConfig();

  var self = this;
  fs.watch(file, function (event, filename) {
    if (event == 'change' && self.config.automaticConfigReload != false) {
      self.updateConfig();
    }
  });
}

Configurator.prototype = Object.create(EventEmitter.prototype);
Configurator.constructor = Configurator;
Configurator.prototype.updateConfig = function () {
  util.log('[' + process.pid + '] reading config file: ' + this.file);

  var self = this;
  fs.readFile(this.file, function (err, data) {
    if (err) { throw err; }
    old_config = self.config;

    self.config = eval('config = ' + data);
    self.emit('configChanged', self.config);
  });
};

exports.Configurator = Configurator;

exports.configFile = function(file, callbackFunc) {
  var config = new Configurator(file);
  config.on('configChanged', function() {
    callbackFunc(config.config, config.oldConfig);
  });
};
