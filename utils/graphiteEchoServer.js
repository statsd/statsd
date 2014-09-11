/*jshint node:true */
'use strict';

var net = require('net');

var server = net.createServer(function(stream) {
	var body = '';
	stream.on('data', function(buffer) {
		body += buffer;
	});
	stream.on('end', function() {
		console.log('end', body);
		body = '';
	});
});

server.listen(2003, console.log.bind(console, 'listened'));

