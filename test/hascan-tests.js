var path = require('path'),
    assert = require('assert'),
    vows = require('vows');

require.paths.unshift(path.join(__dirname, '..', 'lib'));

var hascan = require('hascan');

// *************************************************************************************************

vows.describe('basics').addBatch({
    'tests': {
        'declaration': function() {
        },
    }
}).export(module);
