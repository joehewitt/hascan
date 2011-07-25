var path = require('path'),
    assert = require('assert'),
    vows = require('vows');

require.paths.unshift(path.join(__dirname, '..', 'lib'));

var hascan = require('hascan');

// *************************************************************************************************

vows.describe('basics').addBatch({
    'stripping': {
        'if pass': function() {
            stripTest(
	            'if (has("canvas")) { 1; } else { 2; }',
	        	{canvas: 1},
	        	'{1}');
        },
        'if fail': function() {
            stripTest(
	            'if (has("canvas")) { 1; } else { 2; }',
	        	{},
	        	'{2}');
        },
        'condition pass': function() {
            stripTest(
	            'has("canvas") ? 1 : 2',
	        	{canvas: 1},
	        	'1');
        },
        'condition fail': function() {
            stripTest(
	            'has("canvas") ? 1 : 2',
	        	{},
	        	'2');
        },
        'and logic pass': function() {
            stripTest(
	            'if (has("canvas") && has("audio")) { 1; } else { 2; }',
	        	{canvas: 1, audio: 1},
	        	'{1}');
        },
        'and nested logic pass': function() {
            stripTest(
	            'if (has("canvas") && has("audio") && has("svg")) { 1; } else { 2; }',
	        	{canvas: 1, audio: 1, svg: 1},
	        	'{1}');
        },
        'and nested logic fail': function() {
            stripTest(
	            'if (has("canvas") && has("audio") && has("svg")) { 1; } else { 2; }',
	        	{canvas: 1, audio: 1},
	        	'{2}');
        },
        'and/or nested logic pass': function() {
            stripTest(
	            'if ((has("canvas") && has("audio")) || has("svg")) { 1; } else { 2; }',
	        	{canvas: 1, audio: 1},
	        	'{1}');
        },
        'and/or nested logic pass 2': function() {
            stripTest(
	            'if ((has("canvas") && has("audio")) || has("svg")) { 1; } else { 2; }',
	        	{svg: 1},
	        	'{1}');
        },
        'and/or nested logic fail': function() {
            stripTest(
	            'if ((has("canvas") && has("audio")) || has("svg")) { 1; } else { 2; }',
	        	{},
	        	'{2}');
        },
        'and logic fail': function() {
            stripTest(
	            'if (has("canvas") && has("audio")) { 1; } else { 2; }',
	        	{canvas: 1},
	        	'{2}');
        },
        'or logic pass': function() {
            stripTest(
	            'if (has("canvas") || has("audio")) { 1; } else { 2; }',
	        	{canvas: 1},
	        	'{1}');
        },
        'or logic fail': function() {
            stripTest(
	            'if (has("canvas") || has("audio")) { 1; } else { 2; }',
	        	{},
	        	'{2}');
        },
        'condition logic fail': function() {
            stripTest(
	            'if (has("canvas") ? has("svg") : has("vml")) { 1; } else { 2; }',
	        	{canvas: 1, svg: 1},
	        	'{1}');
        },
        'condition logic fail': function() {
            stripTest(
	            'if (has("canvas") ? has("svg") : has("vml")) { 1; } else { 2; }',
	        	{canvas: 1},
	        	'{2}');
        },
    },

    'find features': {
    	'find one': function() {
    		findTest(
    			'has("canvas")',
    			['canvas']);
    	},

    	'find two': function() {
    		findTest(
    			'if (has("canvas")) {} else if (has("svg")) {}',
    			['canvas', 'svg']);
    	}
    },

    'feature db': {
    	topic: function() {
    		hascan.getFeatureDB(['canvas', 'svg'], this.callback);
    	},

    	'chrome known': function(featureDB) {
    		uaTest(featureDB,
	    		   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_7) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/14.0.803.0 Safari/535.1",
    			   {canvas: true, svg: true});
    	},

    	'chrome unknown minor': function(featureDB) {
    		uaTest(featureDB,
	    		   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_7) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/14.0.99.0 Safari/535.1",
    			   {canvas: true, svg: true});
    	},

    	'unknown': function(featureDB) {
    		uaTest(featureDB,
	    		   "Foobrowser",
    			   null);
    	}    	
    }
}).export(module);

function findTest(js, expected) {
	var source = hascan.findFeatureTests(js);
	assert.deepEqual(source, expected);	
}

function stripTest(js, featureMap, expected) {
	var source = hascan.eliminateFeatureTests(js, featureMap);
	assert.equal(source, expected);	
}

function uaTest(featureDB, userAgent, expected) {
	var featureMap = featureDB.getFeatureMap(userAgent);
	assert.deepEqual(featureMap, expected);
}
