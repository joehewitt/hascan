hascan
===========

Build slim versions of has.js or use has.js on the server to optimize your code.

Slimming has.js
---------------

[has.js][] adds a non-trival amount of code to your pages.  With hascan, you can build a version of has.js that includes only the feature tests you actually use in your code.

    hascan --build svg canvas audio-mp3

This will output a concatenation of the core of has.js and only the individual tests you call for.

    hascan --build < /path/to/file.js

This will read the given file to find out which has('feature') tests are used and output a build of has.js for only those features.

Slimming Your Code
------------------

Give Hascan a user-agent string and it will build a version of your code which eliminates has('feature') branches intended for other browsers.  Using data from [Browserscope][], Hascan can determine which features a browser supports, statically analyze your code using [Uglify][], and safely remove branches not intended for that browser.

    hascan --eliminate -a "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_7) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/14.0.803.0 Safari/535.1" < /path/to/file.js

Installation
------------

    $ npm install hascan

Usage (command line)
-------------------

    Usage: hascan [options] [features]

    Options:
        -b, --build              builds has.js with only the tests you want
                                    Use [features] arguments to specify feature tests to include
                                    Use --file or stdin to include only features tested in JS source
        -e, --eliminate          eliminates has() branches for unavailable features
                                    Use [features] arguments to specify available features
                                    Use --agent to look up the features available for a user-agent
                                    Use --file option or stdin to provide JavaScript to process
        -s, --features           shows a list of features supported by a user agent
                                    Use --agent to specify the user-agent to query
                                    Use [features] arguments to limit list to a set of features
        -t, --tests              shows the names of all tests supported
        -u, --update             downloads the latest data from Browserscope to has.json

        -a, --agent              user agent string
        -f, --file               path of a file to read in
        -m, --minify             minify generated source code

        -h, --help               output help information     

Usage (from Node.js)
-------------------

Eliminating code:

    var hascan = require('hascan');    
    var sourceCode = 'if (has("svg")) { a() } else if (has("canvas")) { b() } else { c() }';
    var featureMap = {svg: false, canvas: true};
    var smallerCode = hascan.eliminateFeatureTests(sourceCode, featureMap);
    console.log(smallerCode);

...
    
    {b()}

        
Getting features supported by a user-agent: 

    var hascan = require('hascan');
    var userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_7) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/14.0.803.0 Safari/535.1";
    hascan.getFeatureDB(['canvas', 'svg', 'activex'], function(err, featureDB) {
        var featureMap = featureDB.getFeatureMap(userAgent);
        console.log(featureMap);
    });

...

    { canvas: true, svg: true, activex: false }

Browserscope
------------

Hascan uses data posted to Browserscope here:

[http://www.browserscope.org/user/tests/table/agt1YS1wcm9maWxlcnINCxIEVGVzdBiG3-0GDA?v=3](http://www.browserscope.org/user/tests/table/agt1YS1wcm9maWxlcnINCxIEVGVzdBiG3-0GDA?v=3)

This data may not yet cover all browsers. If there is a browser missing, [go here](http://joehewitt.com/has/tests/runTests.html) and post test results for that browser.

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

[has.js]: https://github.com/phiggins42/has.js
[Browserscope]: http://www.browserscope.org/user/tests/table/agt1YS1wcm9maWxlcnINCxIEVGVzdBiG3-0GDA?v=3
[Uglify]: https://github.com/mishoo/UglifyJS
