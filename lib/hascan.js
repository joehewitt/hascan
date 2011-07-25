
var abind = require('dandy/errors').abind,
    fs = require('fs'),
    path = require('path'),
    uglify = require('uglify-js'),
    uaparser = require('ua-parser'),
    _ = require('underscore'),
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
                var allTests = hasData.results[browserId].results;
                var minimumTests = db[browserId] = {};
                for (var i = 0; i < featureTests.length; ++i) {
                    var feature = featureTests[i];
                    if (feature in allTests) {
                        minimumTests[feature] = allTests[feature].result ? true : false;
                    }
                }
            }
            // console.log(require('util').inspect(db, null, 200));
            cb(0, this);
        }, cb, this))
    },

    getFeatureMap: function(userAgent, cb) {
        var ua = uaparser.parse(userAgent).toString();
        if (ua in this.db) {
            var featureMap = this.db[ua];
            cb(0, featureMap);
        } else {
            // First, look for match with 3-part version, then 2-part, then 1-part
            cb(0, null);
        }
    }    
};

/**
 * Gets features that are available for a given user agent.
 *
 * Uses the results of has.js tests posted to Browserscope.
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
    cb(0, '');
}

/**
 * Strips out all has('feature') tests that fail for the given features.
 */
exports.stripFeatureTests = function(source, featureMap, minify, beautify) {
    var filters = featureMap ? [exports.hasFilter] : [];
    var ast = transformjs.transform(source, filters);
    return transformjs.generate(ast, minify, beautify);
}

/**
 * Filter you can use to insert has.js removals from your own transformjs pipeline.
 */
exports.getHasFilter = function(featureMap) {
    return function(node, next) {
        if (node.type == 'if') {
            var cond = node.condition;
            if (cond.type == 'call') {
                if (cond.left.type == 'name' && cond.left.name == 'has') {
                    var args = cond.args;
                    if (args.length == 1) {
                        var featureNode = args[0];
                        if (featureNode.type == 'string') {
                            var feature = featureNode.value;
                            if (featureMap[feature]) {
                                return next(node.ifBlock || {type: 'name', name: ''});
                            } else {
                                return next(node.elseBlock || {type: 'name', name: ''});
                            }
                        }
                    }
                }
            }
        }
        return next();
    }
};
