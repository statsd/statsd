/**
 * Unit tests for ipfilter module
 */


var ipfilter = require('../lib/ipfilter');


module.exports = {
	no_config_allow_all: function(test) {
    	test.expect(16);
    	var filter = new ipfilter.IpFilter(null);
    	
    	// Allow all (even invalid rinfo)
        test.equal(filter.check_allowed(), true, "No rinfo");
        test.equal(filter.check_allowed(null), true, "Null rinfo");
        test.equal(filter.check_allowed( {} ), true, "Empty rinfo");
        test.equal(filter.check_allowed( {address: ""} ), true, "Empty address rinfo");
        test.equal(filter.check_allowed( {address: "123.4"} ), true, "Bad address rinfo");  
        test.equal(filter.check_allowed( {address: "127.0.0.1"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:""} ), true, "Epmty family rinfo"); 
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:4} ), true, "Bad family rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:"IPv4"} ), true, "Good loopback rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0", family:"IPv4"} ), true, "Good any rinfo");
        test.equal(filter.check_allowed( {address:"1.2.3.4"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"::1", family:"IPv6"} ), true, "Good loopback ipv6  rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4", family:"IPv6"} ), true, "Good ipv6 rinfo");
        test.equal(filter.check_allowed( {address:"::ffff:192.168.1.1", family:"IPv6"} ), true, "Good ipv6 rinfo");
    	
    	test.done();
  	},
  	empty_config_allow_all: function(test) {
    	test.expect(16);
    	var filter = new ipfilter.IpFilter( { onlyFrom: { } } );
    	
    	// Allow all (even invalid rinfo) same as above
        test.equal(filter.check_allowed(), true, "No rinfo");
        test.equal(filter.check_allowed(null), true, "Null rinfo");
        test.equal(filter.check_allowed( {} ), true, "Empty rinfo");
        test.equal(filter.check_allowed( {address: ""} ), true, "Empty address rinfo");
        test.equal(filter.check_allowed( {address: "123.4"} ), true, "Bad address rinfo");  
        test.equal(filter.check_allowed( {address: "127.0.0.1"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:""} ), true, "Epmty family rinfo"); 
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:4} ), true, "Bad family rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:"IPv4"} ), true, "Good loopback rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0", family:"IPv4"} ), true, "Good any rinfo");
        test.equal(filter.check_allowed( {address:"1.2.3.4"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"::1", family:"IPv6"} ), true, "Good loopback ipv6  rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4", family:"IPv6"} ), true, "Good ipv6 rinfo");
        test.equal(filter.check_allowed( {address:"::ffff:192.168.1.1", family:"IPv6"} ), true, "Good ipv6 rinfo");
    	test.done();
    },
    conf_ipv4_only: function(test) {
    	test.expect(16);
    	var filter = new ipfilter.IpFilter( {
				onlyFrom : {
					family : "IpV4"
				} 
			} );
    	
    	// Deny invalid rinfo
        test.equal(filter.check_allowed(), false, "No rinfo");
        test.equal(filter.check_allowed(null), false, "Null rinfo");
        test.equal(filter.check_allowed( {} ), false, "Empty rinfo");
        test.equal(filter.check_allowed( {address: ""} ), false, "Empty address rinfo");
        test.equal(filter.check_allowed( {address: "123.4"} ), false, "Bad address rinfo");  
        test.equal(filter.check_allowed( {address: "127.0.0.1"} ), false, "No family rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:""} ), false, "Empty family rinfo"); 
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:4} ), false, "Badfamily rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0"} ), false, "Empty family rinfo");
        test.equal(filter.check_allowed( {address:"1.2.3.4"} ), false, "Empty family rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4"} ), false, "No family rinfo");
        
        
        // Allow valid ipv4 addresses
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:"IPv4"} ), true, "Good loopback rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0", family:"IPv4"} ), true, "Good any rinfo");
        test.equal(filter.check_allowed( {address:"1.2.3.4", family:"IPv4"} ), true, "Good ipv4 rinfo");
       
        // Deny ipv6 addresses
        test.equal(filter.check_allowed( {address:"::1", family:"IPv6"} ), false, "Good loopback ipv6 rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4", family:"IPv6"} ), false, "Good ipv6 rinfo");
        
        test.done();
    },
    conf_empty_addresses_allow_all: function(test) {
    	test.expect(16);
    	var filter = new ipfilter.IpFilter( {
				onlyFrom : {
					addresses : []
				} 
			} );
			
		// Allow all (even invalid rinfo)
        test.equal(filter.check_allowed(), true, "No rinfo");
        test.equal(filter.check_allowed(null), true, "Null rinfo");
        test.equal(filter.check_allowed( {} ), true, "Empty rinfo");
        test.equal(filter.check_allowed( {address: ""} ), true, "Empty address rinfo");
        test.equal(filter.check_allowed( {address: "123.4"} ), true, "Bad address rinfo");  
        test.equal(filter.check_allowed( {address: "127.0.0.1"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:""} ), true, "Epmty family rinfo"); 
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:4} ), true, "Bad family rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:"IPv4"} ), true, "Good loopback rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0", family:"IPv4"} ), true, "Good any rinfo");
        test.equal(filter.check_allowed( {address:"1.2.3.4"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"::1", family:"IPv6"} ), true, "Good loopback ipv6  rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4"} ), true, "No family rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4", family:"IPv6"} ), true, "Good ipv6 rinfo");
        test.equal(filter.check_allowed( {address:"::ffff:192.168.1.1", family:"IPv6"} ), true, "Good ipv6 rinfo");
    	
    	test.done();
    },
    conf_1_address: function(test) {
    	test.expect(18);
    	var filter = new ipfilter.IpFilter( {
				onlyFrom : {
					addresses : "1.2.3.4",
				}
			} );
			
		// Deny invalid rinfo
        test.equal(filter.check_allowed(), false, "No rinfo");
        test.equal(filter.check_allowed(null), false, "Null rinfo");
        test.equal(filter.check_allowed( {} ), false, "Empty rinfo");
        test.equal(filter.check_allowed( {address: ""} ), false, "Empty address rinfo");
        test.equal(filter.check_allowed( {address: "123.4"} ), false, "Bad address rinfo");  
        test.equal(filter.check_allowed( {address: "127.0.0.1"} ), false, "No family rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:""} ), false, "Empty family rinfo"); 
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:4} ), false, "Badfamily rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0"} ), false, "Empty family rinfo");
        test.equal(filter.check_allowed( {address:"1.2.3.4"} ), false, "Empty family rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4"} ), false, "No family rinfo");
        
    	
    	// Allow one the specified address
		test.equal(filter.check_allowed( {address: "1.2.3.4", family:"IPv4"} ), true, "Good matching ipv4 rinfo");
        
        // Deny not specified address
        test.equal(filter.check_allowed( {address:"4.3.2.1", family:"IPv4"} ), false, "Non matching ipv4 rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:"IPv4"} ), false, "Non matching loopback rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0", family:"IPv4"} ), false, "Non matching any rinfo");
        test.equal(filter.check_allowed( {address:"::1", family:"IPv6"} ), false, "Non matching loopback ipv6 rinfo");
        test.equal(filter.check_allowed( {address:"::ffff:192.168.1.1", family:"IPv6"} ), false, "Non matching ipv6 rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4", family:"IPv6"} ), false, "Non matching ipv6 rinfo");
        
		test.done();
    },
    conf_2_addresses: function(test) {
    	test.expect(19);
    	var filter = new ipfilter.IpFilter( {
				onlyFrom : {
					addresses : ["1.2.3.4", "5.6.7.8"]
				}
			} );
			
        // Deny invalid rinfo
        test.equal(filter.check_allowed(), false, "No rinfo");
        test.equal(filter.check_allowed(null), false, "Null rinfo");
        test.equal(filter.check_allowed( {} ), false, "Empty rinfo");
        test.equal(filter.check_allowed( {address: ""} ), false, "Empty address rinfo");
        test.equal(filter.check_allowed( {address: "123.4"} ), false, "Bad address rinfo");  
        test.equal(filter.check_allowed( {address: "127.0.0.1"} ), false, "No family rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:""} ), false, "Empty family rinfo"); 
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:4} ), false, "Badfamily rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0"} ), false, "Empty family rinfo");
        test.equal(filter.check_allowed( {address:"1.2.3.4"} ), false, "Empty family rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4"} ), false, "No family rinfo");
        
    	
    	// Allow one the specified address
		test.equal(filter.check_allowed( {address: "1.2.3.4", family:"IPv4"} ), true, "Good matching ipv4 rinfo");
        test.equal(filter.check_allowed( {address: "5.6.7.8", family:"IPv4"} ), true, "Good matching ipv4 rinfo");
        
        // Deny not specified address
        test.equal(filter.check_allowed( {address:"4.3.2.1", family:"IPv4"} ), false, "Non matching ipv4 rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:"IPv4"} ), false, "Non matching loopback rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0", family:"IPv4"} ), false, "Non matching any rinfo");
        test.equal(filter.check_allowed( {address:"::1", family:"IPv6"} ), false, "Non matching loopback ipv6 rinfo");
        test.equal(filter.check_allowed( {address:"::ffff:192.168.1.1", family:"IPv6"} ), false, "Non matching ipv6 rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4", family:"IPv6"} ), false, "Non matching ipv6 rinfo");
        
		test.done();
    },
    conf_with_ipv4_range: function(test) {
    	test.expect(16);
    	var filter = new ipfilter.IpFilter( {
				onlyFrom : {
					addresses : ["1.2.0.0/16", "5.6.7.8"]
				}
			} );
			
		// Deny invalid rinfo
    	test.equal(filter.check_allowed(), false, "No rinfo");
        test.equal(filter.check_allowed(null), false, "Null rinfo");
        test.equal(filter.check_allowed( {} ), false, "Empty rinfo");
        test.equal(filter.check_allowed( {address: ""} ), false, "Empty address rinfo");
        test.equal(filter.check_allowed( {address: "123.4"} ), false, "Bad address rinfo");  
        test.equal(filter.check_allowed( {address: "127.0.0.1"} ), false, "No family rinfo");
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:""} ), false, "Empty family rinfo"); 
        test.equal(filter.check_allowed( {address:"127.0.0.1", family:4} ), false, "Badfamily rinfo");
        test.equal(filter.check_allowed( {address:"0.0.0.0"} ), false, "Empty family rinfo");
        test.equal(filter.check_allowed( {address:"1.2.3.4"} ), false, "Empty family rinfo");
        test.equal(filter.check_allowed( {address:"2607:f0d0:1002:51::4"} ), false, "No family rinfo");
        
        // Allow one of specfied address
		test.equal(filter.check_allowed( {address: "5.6.7.8", family:"IPv4"} ), true, "Good matching ipv4 rinfo");
		
		// Allow any address in range
		test.equal(filter.check_allowed( {address: "1.2.0.0", family:"IPv4"} ), true, "Good matching ipv4 range rinfo");
		test.equal(filter.check_allowed( {address: "1.2.3.4", family:"IPv4"} ), true, "Good matching ipv4 range rinfo");
		
		// Deny adressses out of range
		test.equal(filter.check_allowed( {address:"1.3.0.0", family:"IPv4"} ), false, "Out of range ipv4 rinfo");
		test.equal(filter.check_allowed( {address:"4.3.2.1", family:"IPv4"} ), false, "Out of range ipv4 rinfo");
		
		test.done();
	}
};


 