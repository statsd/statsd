var nodes = [
{host: '127.0.0.1', port: 8125, adminport: 8126},
{host: '127.0.0.1', port: 8128, adminport: 8127},
{host: '127.0.0.1', port: 8129, adminport: 8130}
];

var udp_version = 'udp4';
var host = '0.0.0.0';
var port = '8131';
var checkInterval = 1000;


// Exports the set variables
exports.nodes = nodes;
exports.host  = host;
exports.port  = port;
exports.checkInterval = checkInterval;
exports.udp_version = udp_version;
