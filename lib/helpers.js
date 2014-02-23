/**
 * Public: test function to filter out malformed packets
 *
 * Parameters:
 *
 *   fields - Array of packet data (e.g. [ '100', 'ms', '@0.1' ])
 *
 * Returns true for a valid packet and false otherwise
 */
function isNumber(str) {
    return Boolean(str && !isNaN(str));
}

function is_valid_packet(fields) {

    // test for existing metrics type
    if (fields[1] === undefined) {
        return false;
    }

    // filter out malformed sample rates
    if (fields[2] !== undefined) {
        if (fields[2].length <= 1 || fields[2][0] != '@' || !isNumber(fields[2].substring(1))) {
            return false;
        }
    }

    // filter out invalid metrics values
    switch(fields[1]) {
        case 's':
            return true;
        case 'g':
            return isNumber(fields[0]);
        case 'ms':
            return isNumber(fields[0]) && Number(fields[0]) >= 0;
        default:
            if (!isNumber(fields[0])) {
                return false;
            }
            return true;
    }

};

exports.is_valid_packet = is_valid_packet;
