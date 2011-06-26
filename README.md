Template
========

A simple templating framework based on [Mustache][#mustache]. The main
differences are:

 - Supports template re-use.
 - Supports keypaths in tokens.
 - __NO__ support for partials.
 - __NO__ comments.
 - Probably missing a few more things I don't use.

[#mustache]: http://mustache.github.com/

Usage
-----

On it's way. The tests have some examples if you're that interested.

Development
-----------

Tests require [Node][#node] and [Vows][#vows] to run. To install Vows
using [npm][#npm] run:

    $ npm install vows

Then to run the tests simply enter:

    $ vows template-test.js

[#node]: http://nodejs.org/
[#vows]: http://vowsjs.org/
[#npm]:  http://npmjs.org/

Licence
-------

Released under the MIT license.

