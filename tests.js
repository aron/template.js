/*jslint white: false*/
/*global require*/
var vows     = require('vows'),
    assert   = require('assert'),
    template = require('./template.js').template;

vows.describe('template()').addBatch({
  'should parse simple tokens': {
    topic: template('this is a {{token}} in a string', {token: 'word'}),
    'token should be replaced with "word"': function (topic) {
      assert.equal(topic, 'this is a word in a string');
    }
  }
}).export(module);

