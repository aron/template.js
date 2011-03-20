/*jslint indent: 2 */
(function (undefined) {

  var tags = {
    open:  '{{',
    close: '}}',
    block: '#',
    not:   '^',
    end:   '/'
  }, prefixes = [tags.block, tags.not, tags.end], isArray, indexOf;

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

  function findEndBlock(tokens, key) {
    var nested = 0, index, prefix;
    while (true) {
      // Get the next token.
      index = indexOf(tokens, key);
      if (index > -1) {
        prefix = tokens[index - 1];
        if (prefix === tags.end) {
          if (nested === 0) {
            return index - 2;
          } else {
            nested -= 1;
          }
        } else {
          nested += 1;
        }
      } else {
        break;
      }
    }
    return -1;
  }

  // Traverses an object by key path and returns the value of the final key.
  function keypath(object, path, fallback) {
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
  }

  // Handles the lookup of the variables.
  function lookup(token, data, remaining) {
    return keypath(data, token.value, token.toString());
  }

  function parseTokens(tokens, string, token) {
    var index = string.indexOf(token);

    // If we found the token add it to the array otherwise return null.
    if (index > -1) {
      tokens.push(string.slice(0, index), token);
      return string.slice(index + tags.open.length);
    }

    return string;
  }

  // Parse the string into an array of tokens.
  function parse(string) {
    var tokens = [], prefix, index, result;

    while (true) {
      // find the first open token.
      result = parseTokens(tokens, string, tags.open);

      if (result === string) {
        // No more opening tags we're at the end.
        tokens.push(string);
        break;
      }
      // Update the string.
      string = result;

      // Check to see if we have a special block. Otherwise use null.
      prefix = string[0];
      if (indexOf(prefixes, prefix) > -1) {
        tokens.push(prefix);
        string = string.slice(1);
      } else {
        tokens.push(null);
      }

      // Find the closing tag.
      result = parseTokens(tokens, string, tags.close);

      if (result === string) {
        throw "Missing closing tag in template";
      }
      string = result;
    }

    return tokens;
  }

  // If the next block in the tokens array is a token then
  // creates a token object and returns it. Otherwise returns
  // the first item in the token array.
  function getToken(tokens) {
    var first = tokens.shift();
    if (first === tags.open) {
      return {
        start: first,
        prefix: tokens.shift(),
        value: tokens.shift(),
        end: tokens.shift(),
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
  }

  // Parse the tokens array with a cloned array.
  function render(tokens, data) {
    var compiled = '', parsed, token, key, prefix, index;

    // Walk the tokens array.
    while (tokens.length) {
      token = parsed = getToken(tokens);

      // See if we have a token.
      if (typeof token === 'object') {
        // Update the replaced token.
        parsed = lookup(token, data, tokens);

        if (token.prefix === tags.block) {
          // Check to see if it's block.
          index = findEndBlock(tokens, token.value);

          if (index === -1) {
            throw 'Missing closing block for: ' + token.toString();
          }

          // We have an end block render index as a new template.
          parsed = render(tokens.slice(0, index), parsed);

          // Remove the end block token from the array.
          tokens = tokens.slice(index + 4);
        }

      }
      compiled += parsed;
    }

    return compiled;
  }

  this.template = function (string, data) {
    var tokens = parse(string);
    return render(tokens.slice(), data || {});
  };

}).call(this);

