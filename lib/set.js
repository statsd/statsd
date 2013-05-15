/*jshint node:true, laxcomma:true */

var Set = function() {
  this.store = {};
};

Set.prototype = {
  has: function(value) {
    if (value) {
      return this.store.hasOwnProperty(value);
    } else {
      return false;
    }
  },
  insert: function(value) {
    if (value) {
      this.store[value] = value;
    }
  },
  clear: function() {
    this.store = {};
  },
  values: function() {
    var values = [];
    for (var value in this.store) {
      values.push(value);
    }
    return values;
  }
};

exports.Set = Set;
