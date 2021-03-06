/*jslint indent: 2*/
/*global require, module*/
var vows     = require('vows'),
    assert   = require('assert'),
    template = require('./template');

vows.describe('template()').addBatch({
  'should parse simple tokens': {
    topic: function () {
      return template('this is a {{token}} in a string', {token: 'word'});
    },
    'token should be replaced with "word"': function (topic) {
      assert.equal(topic, 'this is a word in a string');
    }
  },
  'should escape HTML special characters into entities': {
    topic: function () {
      return template('{{token}}', {token: '&, \', ", /, <, >'});
    },
    'token should be replaced with "word"': function (topic) {
      assert.equal(topic, '&amp;, &#x27, &quot;, &#x2F;, &lt;, &gt;');
    }
  },
  'should NOT escape HTML special characters if prefixed with "&"': {
    topic: function () {
      return template('{{&token}}', {token: '&, \', ", /, <, >'});
    },
    'token should be replaced with "word"': function (topic) {
      assert.equal(topic, '&, \', ", /, <, >');
    }
  },
  'should NOT escape HTML special characters if triple braces are used': {
    topic: function () {
      return template('{{{token}}}', {token: '&, \', ", /, <, >'});
    },
    'token should be replaced with "word"': function (topic) {
      assert.equal(topic, '&, \', ", /, <, >');
    }
  },
  'should throw an error if the closing braces are missing': {
    topic: '{{block',
    'an error should be thrown': function (topic) {
      assert.throws(function () {
        template(topic);
      });
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
  },
  'should lookup paths with arrays to find tokens': {
    topic: template('{{people.0.name}}', {people: [{name: 'bill'}]}),
    'should find the name bill at the end of the object keypath': function (topic) {
      assert.equal(topic, 'bill');
    }
  },
  'should use {{.}} to use a non object as data': {
    topic: template('{{.}}', 'bill'),
    'should use bill in the template string': function (topic) {
      assert.equal(topic, 'bill');
    }
  },
  'should if key is a function should call it and use result': {
    topic: template('{{.}}', function () { return 'bill' }),
    'should use bill in the template string': function (topic) {
      assert.equal(topic, 'bill');
    }
  },
  '{{#block}}{{/block}}': {
    'should render the contents of a block': {
      topic: template('{{#block}}{{block.content}}{{/block}}', {block: {content: 'hello'}}),
      'the template should say "hello"': function (topic) {
        assert.equal(topic, 'hello');
      }
    },
    'should throw an error if the closing block is missing': {
      topic: '{{#block}}{{content}}',
      'the template should say "hello"': function (topic) {
        assert.throws(function () {
          template(topic);
        });
      }
    },
    'should render nested blocks': {
      topic: function () {
        return template('{{#a}}{{a.b}}{{#a}}{{a.d.e}}{{/a}}{{a.c}}{{/a}}', {
          a: {d: {e: 'Two in.'}, b: 'One in.', c: 'One in'}
        });
      },
      'should render correctly': function (topic) {
        assert.equal(topic, 'One in.Two in.One in');
      }
    },
    'should render the block if the token is true': {
      topic: function () {
        return template('{{#isLoggedIn}}You are logged in{{/isLoggedIn}}', {isLoggedIn: true});
      },
      'It should display the block contents': function (topic) {
        assert.equal(topic, 'You are logged in');
      }
    },
    'should render tokens inside the conditional block': {
      topic: function () {
        return template('{{#isLoggedIn}}You are logged in as {{name}}{{/isLoggedIn}}', {
          isLoggedIn: true,
          name: 'Jeff'
        });
      },
      'It should display the block contents': function (topic) {
        assert.equal(topic, 'You are logged in as Jeff');
      }
    },
    'should NOT render the block if the token is false': {
      topic: function () {
        return template('{{#isLoggedIn}}You are logged in{{/isLoggedIn}}', {isLoggedIn: false});
      },
      'It should display the block contents': function (topic) {
        assert.equal(topic, '');
      }
    },
    'should render multiple times if the token is an array': {
      topic: function () {
        return template('{{#fruits}}<li>{{name}}</li>{{/fruits}}', {
          'fruits': [{name: 'apple'}, {name: 'orange'}, {name: 'pear'}]
        });
      },
      'should have three list items': function (topic) {
        assert.equal(topic, '<li>apple</li><li>orange</li><li>pear</li>');
      }
    },
    'should use $ rather than the data if not an object': {
      topic: function () {
        return template('{{#fruits}}<li>{{.}}</li>{{/fruits}}', {
          'fruits': ['apple', 'orange', 'pear']
        });
      },
      'should have three list items': function (topic) {
        assert.equal(topic, '<li>apple</li><li>orange</li><li>pear</li>');
      }
    },
    'should render nothing if the array is empty': {
      topic: function () {
        return template('{{#fruits}}<li>{{.}}</li>{{/fruits}}', {
          'fruits': []
        });
      },
      'should have no list items': function (topic) {
        assert.equal(topic, '');
      }
    },
    'should render nothing if the object is empty': {
      topic: function () {
        return template('{{#fruits}}<li>{{.}}</li>{{/fruits}}', {
          'fruits': {}
        });
      },
      'should have no list items': function (topic) {
        assert.equal(topic, '');
      }
    },
    'should render nothing if the value is falsey': {
      topic: new template.Template('{{#key}}contents{{/key}}'),
      'should return an empty string': function (topic) {
        assert.equal(topic.render({key: null}), '');
        assert.equal(topic.render({key: NaN}), '');
        assert.equal(topic.render({key: ''}), '');
      }
    }
  },
  '{{^invert-conditional}}{{/invert-conditional}}': {
    'should render the block if the token is false': {
      topic: function () {
        return template('{{^isLoggedIn}}You are not logged in{{/isLoggedIn}}', {isLoggedIn: false});
      },
      'It should display the block contents': function (topic) {
        assert.equal(topic, 'You are not logged in');
      }
    },
    'should NOT render the block if the token is true': {
      topic: function () {
        return template('{{^isLoggedIn}}You are not logged in{{/isLoggedIn}}', {isLoggedIn: true});
      },
      'It should display the block contents': function (topic) {
        assert.equal(topic, '');
      }
    },
    'should render the block if the token is an empty array': {
      topic: function () {
        return template('{{^fruits}}No fruits{{/fruits}}', {fruits: []});
      },
      'It should display the block contents': function (topic) {
        assert.equal(topic, 'No fruits');
      }
    },
    'should render the block if the token is an empty object': {
      topic: function () {
        return template('{{^props}}No props{{/props}}', {props: {}});
      },
      'It should display the block contents': function (topic) {
        assert.equal(topic, 'No props');
      }
    },
    'should render the block if the token is an empty string': {
      topic: function () {
        return template('{{^message}}No message{{/message}}', {message: ''});
      },
      'It should display the block contents': function (topic) {
        assert.equal(topic, 'No message');
      }
    }
  }
}).export(module);
