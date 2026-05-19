import { describe, it } from 'node:test';
import Metalsmith from 'metalsmith';
import seo from '../src/index.js';
import assert from 'node:assert/strict';

describe('metalsmith-seo performance', () => {
  it('should be fast when running multiple builds without site metadata', (_t, done) => {
    const startTime = Date.now();

    // Reset cache to start fresh

    // Run multiple builds to test caching
    const builds = [];

    for (let i = 0; i < 5; i++) {
      builds.push(
        new Promise((resolve, reject) => {
          Metalsmith('test/fixtures/html')
            .destination(`build-perf-${i}`)
            .use(
              seo({
                hostname: 'https://example.com',
                auto: false
              })
            )
            .process((err) => {
              if (err) {
                return reject(err);
              }
              resolve();
            });
        })
      );
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
});
