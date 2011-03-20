/*jslint indent: 2 */
(function (undefined) {

  var isArray, indexOf;

  /* Public: Tests to see if an object is an Array.
   *
   * object - An Object to test.
   *
   * Examples
   *
   *   isArray([]) // => true
   *
   *   isArray({}) // => false
   *
   * Returns true if the Object is an Array.
   */
  isArray = Array.isArray || function (object) {
    return Object.prototype.toString.call(object) === '[object Array]';
  };

  /* Public: Returns the index of the needle within the haystack.
   * Works with both arrays and strings.
   *
   * haystack - An Array/String to search.
   * needle   - A needle Object to search for.
   *
   * Examples
   *
   *   indexOf([1,2,3,4], 1); // => Returns 0
   *
   *   indexOf([], 'cat'); // => Returns -1
   *
   *   indexOf('Bacon', 'a'); // => Returns 1
   *
   * Returns index of the first found needle or -1 if the needle was
   * not found.
   */
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

  /* Public: Creates a Template instance that can then be rendered
   * with different data. The template is parsed into an array of
   * tokens which can then easily be iterated over to compile a
   * rendered template.
   *
   * The whole process takes three steps.
   *
   * 1. Parse the template into an array of tokens.
   * 2. Find all template tokens in the array and replace them with
   *    values from the data object.
   * 3. Allow plugins to manipulate the data.
   *
   * Because the process is broken down into several steps a template
   * can be rendered many times with different data without having to
   * be reparsed.
   *
   * template - The template String containing tokens.
   * data     - An Object literal of key/value pairs to be supplanted
   *            into the template.
   * options  - Custom options for the Template, currently supports:
   *            tags: An object literal containing open and close
   *            properties. (default: {open: '{{', close: '}}'}).
   *
   * Examples
   *
   *   var template = new Template('{{name}}', {name: 'Aron'});
   *   template.render(); // => Returns "Aron"
   *
   *   var template = new Template('{{person.name}} is {{person.age}}');
   *   template.render({person: {
   *     name: 'Aron',
   *     age: 25
   *   }}); // => Returns "Aron is 25"
   *
   *   var template = new Template('<%name%>', {name: 'Tim'}, {
   *     tags: {open: '<%', close: '%>'}
   *   }); // => Returns "Tim"
   *
   * Returns a new Template instance.
   */
  function Template(template, data, options) {
    this.template = template;
    this.data     = data || {};
    this.options  = options || Template.defaults;
    this.tokens   = this.parse();
  }

  /* Holds all plugins. */
  Template.plugins  = {};

  /* Default option settings. This can be overidden to save continually
   * providing an options Object.
   */
  Template.defaults = {
    tags: {
      open:  '{{',
      close: '}}'
    }
  };

  /* Alias of isArray(). Can be used by plugins. */
  Template.isArray = isArray;

  /* Alias of indexOf(). Can be used by plugins. */
  Template.indexOf = indexOf;

  /* Public: Traverses an object by key path and returns the value of
   * the final key. If the key is not found an optional fallback param
   * is returned. This defaults to null.
   *
   * object    - An Object to query.
   * path      - A dot sepeated keypath String.
   * fallback  - An optional fallback value to return (default: null).
   *
   * Examples
   *
   *   var data = {
   *     tracks: [
   *     {
   *       name: 'Michelle',
   *       url: 'http://www.last.fm/music/The+Beatles/Rubber+Soul/Michelle',
   *       album: {
   *         name: 'Rubber Soul'
   *         url: 'http://www.last.fm/music/The+Beatles/Rubber+Soul'
   *         tracks: 12
   *       },
   *       artist: {
   *         name: 'The Beatles',
   *         url: 'http://www.last.fm/music/The+Beatles'
   *       }
   *     }
   *   ]};
   *
   *   Template.keypath(data, 'tracks.0.artist.name');
   *   //=> 'The Beatles'
   *
   *   Template.keypath(data, 'tracks.0.duration');
   *   //=> null
   *
   *   Template.keypath(data, 'tracks.0.duration', '2.42');
   *   //=> '2.42'
   *
   * Returns the queried value if found. Otherwise returns null unless a
   * fallback parameter is provided.
   */
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
    /* Reassign the prototype. */
    constructor: Template,

    /* Public: Takes a template string and breaks it into an
     * Array of tokens that can easily be parsed by the renderer.
     *
     * For example the template "hello I am {{name}}." will be broken
     * into six pieces:
     *
     * ["Hello I am ", "{{", null, "name", "}}", "."]
     *
     * This makes it very easy to extract tokens from the plain text in the
     * template. The null in this example indicates that there is no plugin
     * prefix. If the token starts with a prefix found in the Template.plugins
     * hash it will be removed from the token an appened to the array.
     *
     * For example if we have a "#" plugin registered and the following
     * template, "{{#block-plugin}}":
     *
     * ["{{", "#", "block-plugin", "}}"]
     *
     * The parsed Array is then returned for rendering.
     *
     * string - A template String.
     *
     * Examples
     *
     *   var template = 'I like {{0}}, {{1}} and {{2}}';
     *   template.parse(template);
     *   // => Returns ["I like ", "{{", null, "0", "}}", ", "
     *   "{{", null, "1", "}}", " and ", "{{", null, "2", "}}"]
     *
     * Returns an Array of tokens.
     */
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

    /* Finds the next occurance of a tag in a string and if found adds it
     * and any preceeding text to the tokens array. Then returns the rest
     * of the string. If no tag is found it simply returns the string.
     *
     * To determine if a tag was found the result can be compared to the
     * string passed in as a parameter.
     *
     * tokens - An Array of tokens to add to.
     * string - The current template String.
     * tag    - The tag to search for, either open/close.
     *
     * Returns the template String.
     */
    _parseTokens: function (tokens, string, tag) {
      var index = string.indexOf(tag);

      // If we found the token add it to the array otherwise return null.
      if (index > -1) {
        tokens.push(string.slice(0, index), tag);
        return string.slice(index + tag.length);
      }

      return string;
    },

    /* Public: Renders the parsed tokens array.
     *
     * Can be used to render a template multiple times using the
     * same parsed data.
     *
     * Works by advances through the array looking for open tags.
     * Other strings are simply added to the comiled string. Tokens
     * are removed from the array and replaced with the data returned
     * from #lookup().
     *
     * If a token has a prefix propery and a plugin is registered for
     * that prefix it will pass the token, the lookup data and the
     * remaining tokens array to the plugin. The result of the plugin
     * will then be added to the compile string.
     *
     * data - Optional data to render. Uses the .data property if
     *        not provided.
     *
     * Returns compiled String with tokens replaced with values from the
     * data Object.
     */
    render: function (data) {
      var tokens   = this.tokens.slice(),
          compiled = '',
          parsed, token, filter;

      data = data || this.data;

      // Walk the tokens array.
      while (tokens.length) {
        token = parsed = this._getToken(tokens);

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

    /* If the next block in the tokens array is a token then
     * creates a token object and returns it. Otherwise returns
     * the first item in the token array.
     *
     * tokens - The current tokens Array.
     *
     * Returns token Object or String.
     */
    _getToken: function (tokens) {
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

    /* Public: Handles the lookup of the token value for the data
     * provided.
     *
     * token - A token String to lookup.
     * data  - A data object.
     *
     * Examples
     *
     *   template.lookup({
     *     value: 'name',
     *     start: '{{',
     *     end:   '}}',
     *     prefix: null
     *   }, {name: 'Bill'}); // => "Bill"
     *
     *   template.lookup(token, {}); // => "{{name}}"
     *
     * Returns found result or the full token.
     */
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

  // Finds the closing block for a token. Handles nested blocks.
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

  // Block plugin. Handles positive conditionals and arrays.
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

  // Closing block. Does nothing but register the '/' prefix for
  // the block plugin.
  Template.plugins['/'] = function () {
    // Remove the block.
    return '';
  };

  // Inverse conditional block. Returns the contents of the
  // block if the value of the token is false. Used as a
  // else block.
  Template.plugins['^'] = function (token, data, tokens) {
    var block = Template.plugins['#'](token, true, tokens);

    // Restore the updated filters.
    if (data !== false) {
      block = '';
    }

    return block;
  };

}).call(this.template.Template);

