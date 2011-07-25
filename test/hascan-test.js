var path = require('path'),
    assert = require('assert'),
    vows = require('vows');

require.paths.unshift(path.join(__dirname, '..', 'lib'));

var hascan = require('hascan');

// *************************************************************************************************

vows.describe('basics').addBatch({
    'tests': {
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
    }
}).export(module);

function stripTest(js, featureMap, result) {
	var source = hascan.stripFeatureTests(js, featureMap);
	assert.equal(source, result);	
}
