/*jshint node:true, laxcomma:true */

const Set = function() {
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
      this.store[value] = true;
    }
  },
  clear: function() {
    this.store = {};
  },
  values: function() {
    let values = [];
    for (const value in this.store) {
      values.push(value);
    }
    return values;
  },
  size: function() {
    return Object.keys(this.store).length;
  }
};

exports.Set = Set;
