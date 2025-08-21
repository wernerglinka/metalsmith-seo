const assert = require('assert');

describe('metalsmith-seo (CommonJS)', function(){
  // Set timeout for the test suite
  this.timeout(5000);
  
  beforeEach(function() {
    // Set test environment to suppress console logs
    process.env.NODE_ENV = 'test';
  });

  it('should load as CommonJS module with default export', function(){
    const seo = require('../lib/index.cjs');
    assert.strictEqual(typeof seo, 'function', 'Default export should be a function');
  });

  it('should work with basic Metalsmith usage', function(){
    const seo = require('../lib/index.cjs');
    
    // Just verify the module works - no need for full integration test here
    assert(typeof seo === 'function', 'Should export a function');
    
    // Verify it returns a Metalsmith plugin function
    const plugin = seo({ hostname: 'http://example.com' });
    assert(typeof plugin === 'function', 'Should return a plugin function');
  });
});