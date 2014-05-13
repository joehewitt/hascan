
var fs = require('fs'),
    path = require('path'),
    uaparser = require('ua-parser'),
    async = require('async'),
    http = require('http'),
    url = require('url'),
    _ = require('underscore'),
    abind = require('dandy/errors').abind,
    ibind = require('dandy/errors').ibind,
    transformjs = require('transformjs');

var browserscopeURL =
    "http://www.browserscope.org/user/tests/table/agt1YS1wcm9maWxlcnINCxIEVGVzdBiG3-0GDA?v=3&o=json";
var featureCache;
var testsCache;

function FeatureDB() {}

FeatureDB.prototype = {
    refresh: function(featureTests, cb) {
        var db = this.db = {};

        exports.readFeatures(abind(function(err, hasData) {
            for (var browserId in hasData.results) {
                var lastSpace = browserId.lastIndexOf(' ');
                var name = browserId.substr(0, lastSpace);
                var version = browserId.substr(lastSpace+1);
                var v = version.split('.');
                
                // XXXjoe Rather than just taking the first major/minor version
                // we find, we should pick the lowest number we can find because
                // it has the greatest chance of being true for all versions after it.
                var majorVersion = name + ' ' + v[0] + '.0';
                var minorVersion = name + ' ' + v[0] + '.' + (v[1] || 0);
                var majorTests;
                if (!(minorVersion in db)) {
                    majorTests = db[minorVersion] = {};
                    if (!(majorVersion in db)) {
                        db[majorVersion] = majorTests;
                    }
                }

                var allTests = hasData.results[browserId].results;
                var minimumTests = db[browserId] = {};
                if (featureTests && featureTests.length) {
                    for (var i = 0; i < featureTests.length; ++i) {
                        var feature = featureTests[i];
                        if (feature in allTests) {
                            storeFeature(feature, allTests[feature].result);
                        }
                    }
                } else {
                    for (var feature in allTests) {
                        storeFeature(feature, allTests[feature].result);
                    }
                }

                function storeFeature(feature, pass) {
                    var has = pass == '1' ? true : false;
                    minimumTests[feature] = has;
                    if (majorTests) {
                        majorTests[feature] = has;
                    }                    
                }
            }

            // console.log(require('util').inspect(db, null, 200));
            cb(0, this);
        }, cb, this))
    },

    /**
     * Gets the features that the given user agent has.
     * 
     * Uses the results of has.js tests posted to Browserscope.
     */
    getFeatureMap: function(userAgent, backwardsCompatible) {
        var parsed = uaparser.parse(userAgent);
        var ua = parsed.toString();
        if (ua in this.db) {
            return this.db[ua];
        } else {
            var major = parseInt(parsed.major);
            var minor = parseInt(parsed.minor) || 0;
            while (major >= 0 && minor >= 0) {
                var minorVersion = parsed.family + ' ' + major + '.' + minor;
                if (minorVersion in this.db) {
                    return this.db[minorVersion];
                }
                if (!backwardsCompatible) {
                    break;
                } else if (--minor < 0) {
                    minor = 0;
                    --major;
                }
            }
            return null;
        }
    }    
};

exports.readFeatures = function(cb) {
    if (featureCache) {
        return cb(0, featureCache);
    }
    var hasJsonPath = path.resolve(path.join(__dirname, '..', 'has.json'));
    fs.readFile(hasJsonPath, abind(function(err, data) {
        featureCache = JSON.parse(data);
        cb(0, featureCache);
    }));
}

/**
 * Loads a feature database for the given set of feature tests.
 */
exports.getFeatureDB = function(featureTests, cb) {
    if (typeof(featureTests) == 'function') { cb = featureTests; featureTests = null; }

    var featureDB = new FeatureDB();
    featureDB.refresh(featureTests, abind(function(err) {
        cb(0, featureDB);
    }, cb, this))
}

/**
 * Gets a list of feature tests found in the source.
 * 
 * Returns map of found features with the value true if they are required features.
 */
exports.findFeatureTests = function(source) {
    var features = {};
    transformjs.transform(source, [
        function(node, next) {
            if (node.TYPE == 'SimpleStatement') {
                var feature = findSimpleFunctionCall(node.body, 'has');
                if (feature) {
                    // true means that the feature is required, indicated when it is inside a statement
                    features[feature] = true;
                }                
            } else {
                var feature = findSimpleFunctionCall(node, 'has');
                if (feature && !(feature in features)) {
                    // true means that the feature is not required
                    features[feature] = false;
                }
            }
            return next();
        }
    ]);
    return features;
}

function findSimpleFunctionCall(node, callName) {
    if (node.TYPE == 'Call') {
        if (node.expression.TYPE == 'SymbolRef' && node.expression.name == callName) {
            var args = node.args;
            if (args.length >= 1) {
                var arg1 = args[0];
                if (arg1.TYPE == 'String') {
                    return arg1.value;
                }
            }
        }
    }    
}

/**
 * Builds has.js with only the specified tests.
 */
exports.buildHasWithTests = function(features, minify, cb) {
    if (typeof(minify) == 'function') { cb = minify; minify = false; }

    if (testsCache) {
        return cb(0, testsCache);
    }

    var hasDirPath = path.resolve(path.join(__dirname, '..', 'external', 'has.js'));
    var detectPath = path.join(hasDirPath, 'detect');
    fs.readdir(detectPath, abind(function(err, fileNames) {
        async.map(fileNames,
            ibind(function(fileName, cb2) {
                var filePath = path.join(detectPath, fileName);
                fs.readFile(filePath, abind(function(err, source) {
                    source = scanHasScript(source+'', features);
                    cb2(0, source);
                }, cb, this))
            }, cb, this),
            abind(function(err, detects) {
                var hasjsPath = path.join(hasDirPath, 'has.js');
                fs.readFile(hasjsPath, abind(function(err, source) {
                    testsCache = source + detects.join('');
                    if (minify) {
                        var ast = transformjs.transform(testsCache);
                        testsCache = transformjs.generate(ast, true);
                    }
                    cb(0, testsCache);
                }, cb, this))
            }, cb, this)
        );
    }, cb, this))
}

function scanHasScript(source, features) {
    var testCount = 0;
    var ast = transformjs.transform(source, [
        function(node, next) {
            // Look for statements containing addtest("feature")
            if (node.TYPE == "SimpleStatement" && node.body.TYPE == "Call") {
                var feature = findSimpleFunctionCall(node.body, 'addtest');
                if (feature) {
                    // Check and see if we used the test anywhere
                    if (features.indexOf(feature) != -1) {
                        ++testCount;
                    } else {
                        // Removes the test because it's not used                        
                        return next(transformjs.EmptyStatement());
                    }
                }
            }   
            return next();
        }
    ]);

    if (!testCount) {
        // No tests were used, so we'll omit the entire module
        return '';
    } else {
        // Return beautified version of transformed script (you can minify later if you'd like)
        return transformjs.generate(ast, false, true);
    }
}

/**
 * Strips out all has('feature') tests that fail for the given features.
 */
exports.eliminateFeatureTests = function(source, featureMap, minify, beautify) {
    var filters = featureMap ? [exports.getHasFilter(featureMap)] : [];
    var ast = transformjs.transform(source, filters);
    return transformjs.generate(ast, minify, beautify);
}

/**
 * Filter you can use to insert has.js removals from your own transformjs pipeline.
 */
exports.getHasFilter = function(featureMap) {
    return transformjs.branchRemover(function(node, next) {
        if (node.TYPE == 'Call') {
            var feature = findSimpleFunctionCall(node, 'has');
            if (feature) {
                return featureMap && featureMap[feature] ? 'pass' : 'fail';                
            }
        }
    });
};

exports.downloadTests = function(cb) {
    var newBrowsers = [];

    var URL = url.parse(browserscopeURL);
    var options = {host: URL.host, port: URL.port, path: URL.pathname+URL.search};

    http.get(options, function(res) {
        var data = [];
        res.on('data', function(chunk) {
            data.push(chunk);
        });

        res.on('end', function() {
            var output = data.join('');
            var hasJsonPath = path.resolve(path.join(__dirname, '..', 'has.json'));
            var previousData;
            fs.readFile(hasJsonPath, function(err, data) {
                previousData = data ? JSON.parse(data) : null;

                if (previousData) {
                    var newData = JSON.parse(output);
                    for (var browserId in newData.results) {
                        if (!(browserId in previousData.results)) {
                            newBrowsers.push(browserId);
                        }
                    }
                }

                fs.writeFile(hasJsonPath, output, function(err) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(0, newBrowsers);
                    }
                });
            });
        });
    }).on('error', function(err) {
        console.error(err);
    });    
}