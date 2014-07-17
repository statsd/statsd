/*jshint node:true, laxcomma:true */
'use strict';

function BackendBase(startupTime, config, emitter) {
	this.startupTime = startupTime;
	this.config = config;
	this.emitter = emitter;

	if (this.onFlushEvent) {
		emitter.on('flush', this.onFlushEvent.bind(this));
	}
	if (this.onStatusEvent) {
		emitter.on('status', this.onStatusEvent.bind(this));
	}
	if (this.onPacketEvent) {
		emitter.on('packet', this.onPacketEvent.bind(this));
	}
}

module.exports = BackendBase;