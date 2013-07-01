/*
** Module: ipfilter
**
 */
 
var ipaddr = require('ipaddr.js');

var IpFilter = function (config) {
	this.self = this;
	this.active = false;
	this.addrs = [];
	if (config && config.onlyFrom) {
		this.family = config.onlyFrom.family;
		if (this.family) {
			this.active = true;
		}
		if (config.onlyFrom.addresses) {
		    var addresses 
			if (typeof config.onlyFrom.addresses === "string") {
				addresses = [config.onlyFrom.addresses];
			} else  {
				addresses = config.onlyFrom.addresses;
			}
			
        	for (var i = 0; i < addresses.length; i++) {
            	var confAddrStr = addresses[i];
            	var parts = confAddrStr.match(/^([^\/]+)\/(\d+)$/);
            	var size, addr;
            	if (parts && parts.length === 3) {
                	// Address is a range ".../bits"
                	addr = ipaddr.parse(parts[1]);
                	size = Number(parts[2]);
            	} else {
                	addr = ipaddr.parse(confAddrStr);
                	size = (addr.kind() === 'ipv6' ? 128 : 32);
            	}
				this.addrs.push({
					'addr' : addr,
					'kind' : addr.kind(),
					'size' : size
					});
			    this.active = true;
        	}
        }
    }
};

IpFilter.prototype.check_allowed = function (rinfo) {
    if (! this.active) {
	    // No filtering -> Allow
		return true;
	}
	
	// Check rinfo parameter
    if (! rinfo || ! rinfo.address || ! ipaddr.isValid(rinfo.address) ||
		! rinfo.family || typeof rinfo.family !== 'string') {
	    // No 'received from' address or family ! -> Deny
        return false;
    }
    
    // Filter based on IP family
    if (this.family && this.family.toLowerCase() !== rinfo.family.toLowerCase()) {
        //console.log('Not allowed IP family: ' + rinfo.family);
        return false;
    }
    
    
    //Filter based on IP address
    if (this.addrs.length) {
    	var inAddr = ipaddr.parse(rinfo.address);
    	var allowed = false;
    
        for (var i = 0; i < this.addrs.length; i++) {
            
            if (inAddr.kind() === this.addrs[i].kind &&
                inAddr.match(this.addrs[i].addr, this.addrs[i].size)) {
                allowed = true;
                break;
            }     
        }
        if (! allowed) {
            //console.log('Not allowed IP adress: ' + rinfo.family);
            return false;
        }
    }
    return true;
};

exports.IpFilter = IpFilter;


