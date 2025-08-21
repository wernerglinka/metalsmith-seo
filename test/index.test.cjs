const assert = require('assert');
const Metalsmith = require('metalsmith');

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

  it('should work with basic Metalsmith usage', function(done){
    const seo = require('../lib/index.cjs');
    
    Metalsmith('test/fixtures/hostname')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        auto: false
      }))
      .build(function(err, files){
        if (err) {return done(err);}
        
        // Basic assertions - just verify it processed files
        assert(files['index.html'], 'Should process HTML files');
        assert(files['sitemap.xml'], 'Should generate sitemap');
        assert(files['robots.txt'], 'Should generate robots.txt');
        
        done();
      });
  });
});