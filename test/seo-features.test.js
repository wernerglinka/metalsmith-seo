import { describe, it, beforeEach } from 'node:test';
import Metalsmith from 'metalsmith';
import seo from '../src/index.js';
import assert from 'node:assert/strict';
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';
// const __dirname = dirname(fileURLToPath(import.meta.url)); // Unused in current tests

describe('metalsmith-seo comprehensive features', () => {
  beforeEach(() => {
    // Reset cache before each test to ensure clean state
  });

  it('should optimize HTML head with SEO metadata', (_t, done) => {
    Metalsmith('test/fixtures/html')
      .use(
        seo({
          hostname: 'http://www.website.com/',
          defaults: {
            title: 'My Site',
            description: 'Default site description',
            socialImage: '/images/default.jpg'
          }
        })
      )
      .process((err, files) => {
        if (err) {
          return done(err);
        }

        const html = files['index.html'].contents.toString();

        // Check for essential SEO elements
        assert(html.includes('<title>'), 'Should have title tag');
        assert(html.includes('meta name="description"'), 'Should have description meta');
        assert(html.includes('property="og:title"'), 'Should have Open Graph title');
        assert(html.includes('name="twitter:card"'), 'Should have Twitter Card');
        assert(html.includes('application/ld+json'), 'Should have JSON-LD');

        // Also generates sitemap
        assert(files['sitemap.xml'], 'Should generate sitemap.xml');

        done();
      });
  });

  it('should use seo frontmatter property when available', (_t, done) => {
    // Use existing fixture and modify files in memory
    Metalsmith('test/fixtures/html')
      .use((files, _metalsmith, done) => {
        // Add seo property to existing file
        files['index.html'].seo = {
          title: 'Custom SEO Title',
          description: 'Custom SEO description',
          image: '/custom-image.jpg'
        };
        done();
      })
      .use(
        seo({
          hostname: 'https://example.com',
          defaults: { title: 'Default Title' }
        })
      )
      .process((err, files) => {
        if (err) {
          return done(err);
        }

        const html = files['index.html'].contents.toString();

        // Should use custom SEO values
        assert(html.includes('Custom SEO Title'), 'Should use seo.title');
        assert(html.includes('Custom SEO description'), 'Should use seo.description');
        assert(html.includes('/custom-image.jpg'), 'Should use seo.image');

        done();
      });
  });

  it('should generate appropriate JSON-LD based on content type', (_t, done) => {
    Metalsmith('test/fixtures/html')
      .destination('build')
      .use((files, _metalsmith, done) => {
        // Modify existing file to be an article
        files['index.html'].title = 'My Article';
        files['index.html'].date = new Date('2024-01-15');
        files['index.html'].author = 'John Doe';
        files['index.html'].seo = {
          title: 'Article Title',
          type: 'article'
        };
        done();
      })
      .use(
        seo({
          hostname: 'https://example.com'
        })
      )
      .process((err, files) => {
        if (err) {
          return done(err);
        }

        const html = files['index.html'].contents.toString();

        // Check for Article schema (with or without spaces in JSON)
        assert(
          html.includes('"@type": "Article"') || html.includes('"@type":"Article"'),
          'Should have Article JSON-LD'
        );
        assert(
          html.includes('"headline": "Article Title"') || html.includes('"headline":"Article Title"'),
          'Should have headline'
        );

        done();
      });
  });

  it('should always optimize HTML since this is an SEO plugin', (_t, done) => {
    Metalsmith('test/fixtures/html')
      .use(
        seo({
          hostname: 'http://www.website.com/'
        })
      )
      .process((err, files) => {
        if (err) {
          return done(err);
        }

        const html = files['index.html'].contents.toString();

        // HTML should be enhanced with SEO tags
        assert(html.includes('<title>'), 'Should have title tag');
        assert(html.includes('meta name="description"'), 'Should have description meta');
        assert(html.includes('property="og:'), 'Should have Open Graph tags');

        // And sitemap should be generated
        assert(files['sitemap.xml'], 'Should generate sitemap');

        done();
      });
  });

  it('should support both sitemap and SEO features simultaneously', (_t, done) => {
    Metalsmith('test/fixtures/html')
      .use(
        seo({
          hostname: 'http://www.website.com/',
          // Sitemap options
          changefreq: 'weekly',
          priority: 0.8,
          // SEO options
          defaults: {
            title: 'Site Title',
            description: 'Site description'
          },
          social: {
            siteName: 'My Site',
            twitterSite: '@mysite'
          }
        })
      )
      .process((err, files) => {
        if (err) {
          return done(err);
        }

        // Check sitemap has the specified options
        const sitemap = files['sitemap.xml'].contents.toString();
        assert(sitemap.includes('<loc>'), 'Sitemap has URLs');

        // Check SEO features are applied
        const html = files['index.html'].contents.toString();
        assert(html.includes('<title>'), 'Has SEO title');
        assert(html.includes('og:site_name'), 'Has Open Graph site name');

        done();
      });
  });

  it('should plumb wordsPerMinute option through to reading time calculation', (_t, done) => {
    Metalsmith('test/fixtures/html')
      .use((files, _metalsmith, done) => {
        // 600 words at 200 wpm = 3 min; at 600 wpm = 1 min
        files['index.html'] = {
          contents: Buffer.from(`<html><head></head><body>${'word '.repeat(600)}</body></html>`)
        };
        done();
      })
      .use(seo({ hostname: 'https://example.com', wordsPerMinute: 600 }))
      .process((err, files) => {
        if (err) {
          return done(err);
        }
        assert.equal(
          files['index.html'].seoMetadata.readingTime,
          1,
          'wordsPerMinute: 600 should yield 1-minute reading time for 600 words'
        );
        done();
      });
  });
});
