/**
 * Public: test function to filter out malformed packets
 *
 * Parameters:
 *
 *   fields - Array of packet data (e.g. [ '100', 'ms', '@0.1' ])
 *
 * Returns true for a valid packet and false otherwise
 */
function is_valid_packet(fields) {

    // test for existing metrics type
    if (fields[1] === undefined) {
        return false;
    }
    // filter out invalid metrics values
    else if (fields[1] == 's') {
        return true;
    }
    else if (fields[1] == 'g') {
        //
        // Broken up into 2 parts: First is original test
        // second test looks for exponential format such as 9e06, -4.22123e-01
        //
        if (!fields[0].match(/^([\-\+\d\.]+$)/) && 
            !fields[0].match(/^([\-\+]?\d?[\.]?[\-\+]?[\d]*[eE][\-\+]?[\d]+$)/))
        {
            return false;
        } else {
            return true;
        }
    }
    else if (!fields[0].match(/^([\d\.]+$)/)) {
        return false;
    }
    // filter out malformed sample rates
    else if (fields[2] && !fields[2].match(/^@([\d\.]+$)/)) {
        return false;
    }
    // looks like we're good
    else {
        return true;
    }

};

exports.is_valid_packet = is_valid_packet;
