/*jslint indent: 2*/
/*global require, module*/
var vows     = require('vows'),
    assert   = require('assert'),
    template = require('./template.js').template;

vows.describe('template()').addBatch({
  'should parse simple tokens': {
    topic: function () {
      return template('this is a {{token}} in a string', {token: 'word'});
    },
    'token should be replaced with "word"': function (topic) {
      assert.equal(topic, 'this is a word in a string');
    }
  },
  'should parse multiple tokens in a string': {
    topic: function () {
      return template('there is an {{first}}, {{second}} and {{third}}', {
        first: 'apple',
        second: 'orange',
        third: 'pear'
      });
    },
    'tokens should be replaced with data values': function (topic) {
      assert.equal(topic, 'there is an apple, orange and pear');
    }
  },
  'should ignore tokens that could not be found': {
    topic: template('{{missing}}'),
    'token should not be parsed': function (topic) {
      assert.equal(topic, '{{missing}}');
    }
  },
  'should lookup paths to find tokens': {
    topic: template('{{people.bill.age}}', {people: {bill: {age: 'twenty'}}}),
    'should find the age key at the end of the object keypath': function (topic) {
      assert.equal(topic, 'twenty');
    }
  }
}).export(module);

