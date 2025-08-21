import Metalsmith from 'metalsmith';
import seo from '../lib/index.js';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('metalsmith-seo robots.txt functionality', function() {
  this.timeout(5000);
  
  beforeEach(function() {
    // Reset cache before each test to ensure clean state
  });
  
  it('should generate robots.txt when none exists', function(done) {
    Metalsmith('test/fixtures/html')
      .use(seo({
        hostname: 'https://example.com'
      }))
      .build(function(err, files) {
        if (err) return done(err);
        
        // Should generate robots.txt
        assert(files['robots.txt'], 'Should generate robots.txt');
        
        const robotsContent = files['robots.txt'].contents.toString();
        
        // Check basic robots.txt structure
        assert(robotsContent.includes('User-agent: *'), 'Should have user agent directive');
        assert(robotsContent.includes('Disallow:'), 'Should have disallow directive');
        assert(robotsContent.includes('Sitemap: https://example.com/sitemap.xml'), 'Should reference sitemap');
        
        done();
      });
  });
  
  it('should add sitemap reference to existing robots.txt', function(done) {
    Metalsmith('test/fixtures/html')
      .use(function(files, metalsmith, done) {
        // Add existing robots.txt without sitemap reference
        files['robots.txt'] = {
          contents: Buffer.from('User-agent: *\nDisallow: /private/\n'),
          mode: '0644'
        };
        done();
      })
      .use(seo({
        hostname: 'https://example.com'
      }))
      .build(function(err, files) {
        if (err) return done(err);
        
        const robotsContent = files['robots.txt'].contents.toString();
        
        // Should preserve existing content
        assert(robotsContent.includes('Disallow: /private/'), 'Should preserve existing disallow');
        
        // Should add sitemap reference
        assert(robotsContent.includes('Sitemap: https://example.com/sitemap.xml'), 'Should add sitemap reference');
        
        done();
      });
  });
  
  it('should not modify robots.txt that already has sitemap reference', function(done) {
    const existingContent = 'User-agent: *\nDisallow: /admin/\nSitemap: https://example.com/custom-sitemap.xml\n';
    
    Metalsmith('test/fixtures/html')
      .use(function(files, metalsmith, done) {
        // Add existing robots.txt with sitemap reference
        files['robots.txt'] = {
          contents: Buffer.from(existingContent),
          mode: '0644'
        };
        done();
      })
      .use(seo({
        hostname: 'https://example.com'
      }))
      .build(function(err, files) {
        if (err) return done(err);
        
        const robotsContent = files['robots.txt'].contents.toString();
        
        // Should not add duplicate sitemap reference
        const sitemapMatches = (robotsContent.match(/Sitemap:/gi) || []).length;
        assert.strictEqual(sitemapMatches, 1, 'Should not duplicate sitemap references');
        
        // Should preserve existing sitemap URL
        assert(robotsContent.includes('custom-sitemap.xml'), 'Should preserve existing sitemap URL');
        
        done();
      });
  });
  
  it('should support custom robots.txt configuration', function(done) {
    Metalsmith('test/fixtures/html')
      .use(seo({
        hostname: 'https://example.com',
        robots: {
          disallowPaths: ['/admin/', '/private/'],
          userAgent: 'Googlebot'
        }
      }))
      .build(function(err, files) {
        if (err) return done(err);
        
        const robotsContent = files['robots.txt'].contents.toString();
        
        // Check custom configuration
        assert(robotsContent.includes('User-agent: Googlebot'), 'Should use custom user agent');
        assert(robotsContent.includes('Disallow: /admin/'), 'Should include first disallow path');
        assert(robotsContent.includes('Disallow: /private/'), 'Should include second disallow path');
        
        done();
      });
  });
  
  it('should respect enableRobots=false option', function(done) {
    Metalsmith('test/fixtures/html')
      .use(seo({
        hostname: 'https://example.com',
        enableRobots: false
      }))
      .build(function(err, files) {
        if (err) return done(err);
        
        // Should not generate robots.txt
        assert(!files['robots.txt'], 'Should not generate robots.txt when disabled');
        
        // But should still generate sitemap
        assert(files['sitemap.xml'], 'Should still generate sitemap.xml');
        
        done();
      });
  });
  
  it('should coordinate with custom sitemap filename', function(done) {
    Metalsmith('test/fixtures/html')
      .use(seo({
        hostname: 'https://example.com',
        sitemap: {
          output: 'my-sitemap.xml'
        }
      }))
      .build(function(err, files) {
        if (err) return done(err);
        
        const robotsContent = files['robots.txt'].contents.toString();
        
        // Should reference custom sitemap filename
        assert(robotsContent.includes('Sitemap: https://example.com/my-sitemap.xml'), 
               'Should reference custom sitemap filename');
        
        // And custom sitemap should exist
        assert(files['my-sitemap.xml'], 'Should generate custom sitemap file');
        
        done();
      });
  });
});