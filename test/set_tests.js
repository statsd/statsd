var set = require('../lib/set')

module.exports = {
  has_returns_expected_values: function(test) {
    test.expect(2);
    var s = new set.Set();
    s.insert('a');
    test.ok(s.has('a'));
    test.ok(!s.has('b'));
    test.done();
  },
  clear_empties_the_set: function(test) {
    test.expect(3);
    var s = new set.Set();
    s.insert('a');
    test.equal(1, s.values().length);
    s.clear();
    test.equal(0, s.values().length);
    test.equal([], s.values().length);
    test.done();
  },
  values_returns_values: function(test) {
    test.expect(3);
    var s = new set.Set();
    s.insert('a');
    s.insert('b');
    test.equal(2, s.values().length);
    test.ok(s.values().indexOf('a') != -1);
    test.ok(s.values().indexOf('b') != -1);
    test.done();
  },
  values_are_unique: function(test) {
    test.expect(1);
    var s = new set.Set();
    s.insert('a');
    s.insert('a');
    s.insert('b');
    test.equal(2, s.values().length);
    test.done();
  }
}
