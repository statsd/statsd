#!/usr/bin/env node
try {
    var reporter = require('nodeunit').reporters.default;
}
catch(e) {
    console.log("Cannot find nodeunit module.");
    console.log("Make sure to run 'npm install nodeunit'");
    process.exit();
}

process.chdir(__dirname);
reporter.run(['test/'], null, function(failure) {
   process.exit(failure ? 1 : 0)
});
