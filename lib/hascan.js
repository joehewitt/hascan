
var fs = require('fs'),
    path = require('path'),
    uglify = require('uglify-js'),
    uaparser = require('ua-parser'),
    async = require('async'),
    _ = require('underscore'),
    abind = require('dandy/errors').abind,
    ibind = require('dandy/errors').ibind,
    transformjs = require('transformjs');

function FeatureDB() {
    
}

FeatureDB.prototype = {
    refresh: function(featureTests, cb) {
        var db = this.db = {};

        var hasJsonPath = path.resolve(path.join(__dirname, '..', 'has.json'));
        fs.readFile(hasJsonPath, abind(function(err, data) {
            var hasData = JSON.parse(data);

            for (var browserId in hasData.results) {
                var lastSpace = browserId.lastIndexOf(' ');
                var name = browserId.substr(0, lastSpace);
                var version = browserId.substr(lastSpace+1);
                var v = version.split('.');
                
                // XXXjoe Rather than just taking the first major/minor version
                // we find, we should pick the lowest number we can find because the
                // lowest version we can find because it has the greatest chance of
                // being true for all versions after it.
                var minorVersion = name + ' ' + v[0] + '.' + (v[1] || 0);
                var majorTests;
                if (!(minorVersion in db)) {
                    majorTests = db[minorVersion] = {};
                }

                var allTests = hasData.results[browserId].results;
                var minimumTests = db[browserId] = {};
                for (var i = 0; i < featureTests.length; ++i) {
                    var feature = featureTests[i];
                    if (feature in allTests) {
                        var has = allTests[feature].result ? true : false;
                        minimumTests[feature] = has;
                        if (majorTests) {
                            majorTests[feature] = has;
                        }
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
    getFeatureMap: function(userAgent) {
        var parsed = uaparser.parse(userAgent);
        var ua = parsed.toString();
        if (ua in this.db) {
            return this.db[ua];
        } else {
            var minorVersion = parsed.family + ' ' + parsed.major + '.' + (parsed.minor || 0);
            if (minorVersion in this.db) {
                return this.db[minorVersion];
            } else {
                return null;
            }
        }
    }    
};

/**
 * Loads a feature database for the given set of feature tests.
 */
exports.getFeatureDB = function(featureTests, cb) {
    var featureDB = new FeatureDB();
    featureDB.refresh(featureTests, abind(function(err) {
        cb(0, featureDB);
    }, cb, this))
}

/**
 * Gets a list of feature tests found in the source.
 */
exports.findFeatureTests = function(source) {
    var features = {};
    transformjs.transform(source, [
        function(node, next) {
            if (node.type == 'call') {
                if (node.left.type == 'name' && node.left.name == 'has') {
                    var args = node.args;
                    if (args.length == 1) {
                        var featureNode = args[0];
                        if (featureNode.type == 'string') {
                            var feature = featureNode.value;
                            features[feature] = 1;
                        }
                    }
                }
            }
            return next();
        }
    ]);
    return _.keys(features);
}

/**
 * Builds has.js with only the specified tests.
 */
exports.buildHasWithTests = function(features, cb) {
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
                    var js = source + detects.join('');
                    cb(0, js);
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
            if (node.type == "stat" && node.expr.type == "call") {
                var call = node.expr;
                if (call.left.type == 'name' && call.left.name == 'addtest') {
                    var featureNode = call.args[0];
                    if (featureNode.type == 'string') {
                        // If feature test is not used, remove it
                        var feature = featureNode.value;
                        if (features.indexOf(feature) != -1) {
                            ++testCount;
                        } else {
                            return null;
                        }
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
exports.stripFeatureTests = function(source, featureMap, minify, beautify) {
    var filters = featureMap ? [exports.getHasFilter(featureMap)] : [];
    var ast = transformjs.transform(source, filters);
    return transformjs.generate(ast, minify, beautify);
}

/**
 * Filter you can use to insert has.js removals from your own transformjs pipeline.
 */
exports.getHasFilter = function(featureMap) {
    return function(node, next) {
        if (node.type == 'if' || node.type == 'conditional') {
            return branch(node, evalNode(node.condition));
        } else {
            return next();            
        }

        function evalNode(node) {
            if (node.type == 'conditional') {
                return evalCondition(node);
            } else if (node.type == 'binary') {
                return evalLogic(node);
            } else if (node.type == 'call') {
                return evalCall(node);
            } else {
                return 'next';
            }
        }

        function evalCondition(conditionNode) {
            var condition = evalNode(conditionNode.condition);
            if (condition == 'pass' || condition == 'fail') {
                return condition == 'pass'
                    ? evalNode(conditionNode.ifBlock)
                    : evalNode(conditionNode.elseBlock);
            } else {
                return 'next';
            }
        }

        function evalLogic(binaryNode) {
            var left = evalNode(binaryNode.left);
            var right = evalNode(binaryNode.right);
            if (left != 'next' && right != 'next') {
                if (binaryNode.op == '&&') {
                    return left == 'pass' && right == 'pass' ? 'pass' : 'fail';
                } else if (binaryNode.op == '||') {
                    return left == 'pass' || right == 'pass' ? 'pass' : 'fail';
                }
            }
            return 'next';
        }

        function evalCall(callNode) {
            if (callNode.left.type == 'name' && callNode.left.name == 'has') {
                var args = callNode.args;
                if (args.length == 1) {
                    var featureNode = args[0];
                    if (featureNode.type == 'string') {
                        var feature = featureNode.value;
                        return featureMap[feature] ? 'pass' : 'fail';
                    }
                }
            }
            return 'next';
        }

        function branch(conditionNode, result) {
            if (result == 'pass') {
                return next(conditionNode.ifBlock || {type: 'name', name: ''});
            } else if (result == 'fail') {
                return next(conditionNode.elseBlock || {type: 'name', name: ''});
            } else {
                return next();
            }
        }
    }
};
