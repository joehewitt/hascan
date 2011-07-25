hascan
===========

Build slim versions of has.js or use has.js on the server to optimize your code.

Slimming has.js
---------------

has.js is a broad set of browser feature tests, but it can be costly to include the full tests suite in your web apps.  With hascan, you can build a version of has.js that includes only the feature tests you actually use in your code.

Slimming Your Code
------------------

The best way to use has.js is not to use it at all. Hascan can make browser-specific versions of your code by eliminating branches of code meant for other browsers.  Using data from [Browserscope](http://www.browserscope.org/user/tests/table/agt1YS1wcm9maWxlcnINCxIEVGVzdBiG3-0GDA?v=3), Hascan can take a user-agent string and determine ahead of time which features that browser supports.  Your code can then be statically analyzed using [Uglify](https://github.com/mishoo/UglifyJS) to find has('feature') tests that don't apply to the browser, and remove them for you.

Status
------------

Work-in-progress and intended only for myself for now.

Installation
------------

    $ npm install hascan (someday! not in registry yet)

Usage
------------

...

License 
-------

Copyright 2011 Joe Hewitt

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
 
   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
