const Logger = require('../lib/logger').Logger;

function captureLog(fn) {
  const lines = [];
  const orig = console.log;
  console.log = function () {
    lines.push(Array.prototype.join.call(arguments, ' '));
  };
  try {
    fn(lines);
  } finally {
    console.log = orig;
  }
  return lines;
}

module.exports = {

  stdout_omits_debug_when_level_is_info: function (test) {
    const l = new Logger({ backend: 'stdout', level: 'LOG_INFO' });
    const lines = captureLog(function () {
      l.log('hidden', 'DEBUG');
    });
    test.equal(0, lines.length);
    test.done();
  },

  stdout_emits_info_when_level_is_info: function (test) {
    const l = new Logger({ backend: 'stdout', level: 'LOG_INFO' });
    const lines = captureLog(function () {
      l.log('visible', 'INFO');
    });
    test.equal(1, lines.length);
    test.ok(lines[0].indexOf('INFO: visible') !== -1);
    test.done();
  },

  stdout_emits_warning_and_error_when_level_is_info: function (test) {
    const l = new Logger({ backend: 'stdout', level: 'LOG_INFO' });
    const lines = captureLog(function () {
      l.log('warn', 'WARNING');
      l.log('err', 'ERROR');
    });
    test.equal(2, lines.length);
    test.ok(lines[0].indexOf('WARNING: warn') !== -1);
    test.ok(lines[1].indexOf('ERROR: err') !== -1);
    test.done();
  },

  stdout_omits_info_when_level_is_err: function (test) {
    const l = new Logger({ backend: 'stdout', level: 'LOG_ERR' });
    const lines = captureLog(function () {
      l.log('hidden', 'INFO');
      l.log('also hidden', 'DEBUG');
    });
    test.equal(0, lines.length);
    test.done();
  },

  stdout_emits_error_when_level_is_err: function (test) {
    const l = new Logger({ backend: 'stdout', level: 'LOG_ERR' });
    const lines = captureLog(function () {
      l.log('visible', 'ERROR');
    });
    test.equal(1, lines.length);
    test.ok(lines[0].indexOf('ERROR: visible') !== -1);
    test.done();
  },

  stdout_untyped_uses_configured_level: function (test) {
    const l = new Logger({ backend: 'stdout', level: 'LOG_INFO' });
    const lines = captureLog(function () {
      l.log('no type given');
    });
    test.equal(1, lines.length);
    test.ok(lines[0].indexOf('DEBUG: no type given') !== -1);
    test.done();
  },

  stdout_untyped_emits_when_level_is_err: function (test) {
    const l = new Logger({ backend: 'stdout', level: 'LOG_ERR' });
    const lines = captureLog(function () {
      l.log('still visible');
    });
    test.equal(1, lines.length);
    test.ok(lines[0].indexOf('DEBUG: still visible') !== -1);
    test.done();
  },

  stdout_emits_untyped_when_level_is_debug: function (test) {
    const l = new Logger({ backend: 'stdout', level: 'LOG_DEBUG' });
    const lines = captureLog(function () {
      l.log('visible');
    });
    test.equal(1, lines.length);
    test.ok(lines[0].indexOf('DEBUG: visible') !== -1);
    test.done();
  },

  stdout_accepts_log_error_as_level_alias: function (test) {
    const l = new Logger({ backend: 'stdout', level: 'LOG_ERROR' });
    const lines = captureLog(function () {
      l.log('hidden', 'INFO');
      l.log('visible', 'ERROR');
    });
    test.equal(1, lines.length);
    test.ok(lines[0].indexOf('ERROR: visible') !== -1);
    test.done();
  },

  default_level_is_log_info: function (test) {
    const l = new Logger({});
    test.equal('stdout', l.backend);
    test.equal('LOG_INFO', l.level);
    const lines = captureLog(function () {
      l.log('hidden', 'DEBUG');
      l.log('visible', 'INFO');
    });
    test.equal(1, lines.length);
    test.ok(lines[0].indexOf('INFO: visible') !== -1);
    test.done();
  },

  invalid_backend_throws: function (test) {
    test.throws(function () {
      new Logger({ backend: 'file' });
    });
    test.done();
  },

  stdout_undefined_type_throws: function (test) {
    const l = new Logger({ backend: 'stdout', level: 'LOG_INFO' });
    test.throws(function () {
      l.log('bad', 'VERBOSE');
    }, /Undefined log level: LOG_VERBOSE/);
    test.done();
  }

};
