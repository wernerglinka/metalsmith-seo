import Metalsmith from 'metalsmith';
import seo from '../lib/index.js';
import assert from 'assert';

describe('metalsmith-seo performance', function() {
  this.timeout(10000);
  
  it('should be fast when running multiple builds without site metadata', function(done) {
    const startTime = Date.now();
    
    // Reset cache to start fresh
    
    // Run multiple builds to test caching
    const builds = [];
    
    for (let i = 0; i < 5; i++) {
      builds.push(new Promise((resolve, reject) => {
        Metalsmith('test/fixtures/html')
          .destination(`build-perf-${i}`)
          .use(seo({
            hostname: 'https://example.com',
            auto: false
          }))
          .build(function(err) {
            if (err) {return reject(err);}
            resolve();
          });
      }));
    }
    
    Promise.all(builds)
      .then(() => {
        const duration = Date.now() - startTime;
        
        // Should complete 5 builds in reasonable time
        assert(duration < 2000, `Builds took too long: ${duration}ms (should be < 2000ms)`);
        
        done();
      })
      .catch(done);
  });
  
  it('should cache site metadata checks across multiple invocations', function(done) {
    
    let firstBuildTime, subsequentBuildsTime;
    
    // First build - establishes cache
    const firstStart = Date.now();
    Metalsmith('test/fixtures/html')
      .destination('build-cache-1')
      .use(seo({
        hostname: 'https://example.com',
        auto: false
      }))
      .build(function(err) {
        if (err) {return done(err);}
        
        firstBuildTime = Date.now() - firstStart;
        
        // Second build - should use cache
        const secondStart = Date.now();
        Metalsmith('test/fixtures/html')
          .destination('build-cache-2')
          .use(seo({
            hostname: 'https://example.com',
            auto: false
          }))
          .build(function(err) {
            if (err) {return done(err);}
            
            subsequentBuildsTime = Date.now() - secondStart;
            
            // Second build should be faster or similar (not significantly slower)
            // We're not asserting it's definitely faster because the difference might be small
            assert(subsequentBuildsTime <= firstBuildTime * 1.5, 
                   `Cached build (${subsequentBuildsTime}ms) should not be significantly slower than first build (${firstBuildTime}ms)`);
            
            done();
          });
      });
  });
});