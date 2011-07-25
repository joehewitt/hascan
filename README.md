hascan
===========

A way to leverage has.js in the most optimal way possible for Node.js web apps.

1. Leverage Browserscope database of has.js tests for many user agents
2. For each user agent, remove code where if(has('feature')) fails
3. If you must serve has.js to browsers, build a version that uas only the tests you need

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
