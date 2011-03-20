/*jslint indent: 2 */
(function (undefined) {

  var prefixes, isArray, indexOf;

  isArray = Array.isArray || function (object) {
    return Object.prototype.toString.call(object) === '[object Array]';
  };

  indexOf = function (haystack, needle) {
    var index, count;

    if (haystack.indexOf) {
      return haystack.indexOf(needle);
    }

    for (index = 0, count = haystack.length; index < count; index += 1) {
      if (haystack[index] === needle) {
        return index;
      }
    }
    return -1;
  };

  function Template(template, data, options) {
    this.template = template;
    this.data     = data || {};
    this.options  = options || Template.defaults;
    this.tokens   = this.parse();
  }

  Template.plugins  = {};
  Template.defaults = {
    tags: {
      open:  '{{',
      close: '}}'
    }
  };

  Template.isArray = isArray;
  Template.indexOf = indexOf;

  // Traverses an object by key path and returns the value of the final key.
  Template.keypath = function (object, path, fallback) {
    var keys = (path || '').split('.'),
        key;

    while (object && keys.length) {
      key = keys.shift();

      if (object.hasOwnProperty(key)) {
        object = object[key];

        if (keys.length === 0 && object !== undefined) {
          return object;
        }
      } else {
        break;
      }
    }

    return (arguments.length > 2) ? fallback : null;
  };

  Template.prototype = {
    constructor: Template,

    // Parse the string into an array of tokens.
    parse: function (string) {
      var tokens = [], prefix, index, result;

      string = string || this.template;

      while (true) {
        // find the first open token.
        result = this._parseTokens(tokens, string, this.options.tags.open);

        if (result === string) {
          // No more opening tags we're at the end.
          tokens.push(string);
          break;
        }
        // Update the string.
        string = result;

        // Check to see if we have a special block. Otherwise use null.
        prefix = string[0];
        if (Template.plugins[prefix]) {
          tokens.push(prefix);
          string = string.slice(1);
        } else {
          tokens.push(null);
        }

        // Find the closing tag.
        result = this._parseTokens(tokens, string, this.options.tags.close);

        if (result === string) {
          throw "Missing closing tag in template";
        }
        string = result;
      }

      return tokens;
    },

    _parseTokens: function (tokens, string, tag) {
      var index = string.indexOf(tag);

      // If we found the token add it to the array otherwise return null.
      if (index > -1) {
        tokens.push(string.slice(0, index), tag);
        return string.slice(index + tag.length);
      }

      return string;
    },

    // Parse the tokens array with a cloned array.
    render: function (data) {
      var tokens   = this.tokens.slice(),
          compiled = '',
          parsed, token, filter;

      data = data || this.data;

      // Walk the tokens array.
      while (tokens.length) {
        token = parsed = this.getToken(tokens);

        // See if we have a token.
        if (typeof token === 'object') {
          // Update the replaced token.
          parsed = this.lookup(token, data);
          if (Template.plugins[token.prefix]) {
            parsed = Template.plugins[token.prefix].call(this, token, parsed, tokens);
          }
        }

        compiled += parsed;
      }

      return compiled;
    },

    // If the next block in the tokens array is a token then
    // creates a token object and returns it. Otherwise returns
    // the first item in the token array.
    getToken: function (tokens) {
      var first = tokens.shift();
      if (first === this.options.tags.open) {
        return {
          start:  first,
          prefix: tokens.shift(),
          value:  tokens.shift(),
          end:    tokens.shift(),
          toString: function () {
            return [
              this.start,
              this.prefix || '',
              this.value,
              this.end
            ].join('');
          }
        };
      }
      return first;
    },

    // Handles the lookup of the variables.
    lookup: function lookup(token, data) {
      return Template.keypath(data, token.value, token.toString());
    }
  };

  this.template = function (string, data, options) {
    return (new Template(string, data, options)).render();
  };
  this.template.Template = Template;

}).call(this);

// Plugins
(function () {
  var Template = this;

  function findEndBlock(tokens, key, closePrefix) {
    var nested = 0, offset = 0, index, prefix;

    while (true) {
      // Get the next token.
      index = Template.indexOf(tokens.slice(offset), key) + offset;

      if (index > -1) {
        prefix = tokens[index - 1];
        if (prefix === closePrefix) {
          if (nested === 0) {
            return index - 2;
          } else {
            offset = index + 1;
            nested -= 1;
          }
        } else {
          offset = index + 1;
          nested += 1;
        }
      } else {
        break;
      }
    }
    return -1;
  }

  // Plugins.
  Template.plugins['#'] = function (token, data, tokens) {
    // Check to see if it's block.
    var index = findEndBlock(tokens, token.value, '/'),
        content, template;

    if (index === -1) {
      throw 'Missing closing block for: ' + token.toString();
    }

    // Remove the parsed block. And return it as a template string.
    content  = tokens.splice(0, tokens.slice(0, index).length).join('');
    template = new Template(content);

    if (typeof data === 'boolean') {
      content = template.render(this.data);
      if (data === false) {
        content = '';
      }
    } else if (Template.isArray(data)) {
      return (function () {
        var items  = [],
            length = data.length,
            i = 0, current;

        for (; i < length; i += 1) {
          current = data[i];
          current = typeof current === 'object' ? current : {$: current};
          items.push(template.render(current));
        }
        return items.join('');
      })();
    } else {
      // We have an end block render index as a new template.
      content = template.render(data);
    }

    return content;
  };

    // Closing block.
  Template.plugins['/'] = function () {
      // Remove the block.
      return '';
  };

  // Conditional block.
  Template.plugins['^'] = function (token, data, tokens) {
    var block = Template.plugins['#'](token, true, tokens);

    // Restore the updated filters.
    if (data !== false) {
      block = '';
    }

    return block;
  };

}).call(this.template.Template);

