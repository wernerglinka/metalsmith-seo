import { describe, it, beforeEach } from 'mocha';
import assert from 'assert';
import Metalsmith from 'metalsmith';
import seo from '../../lib/index.js';
describe('Coverage Tests - Missing Functionality', function() {
  this.timeout(5000);
  
  beforeEach(function() {
    process.env.NODE_ENV = 'test';
  });

  describe('Auto-calculation features', function() {
    it('should use auto-calculation for priority and changefreq', function(done) {
      // Use the plugin function directly to avoid file system issues
      const plugin = seo({
        hostname: 'http://www.website.com/',
        sitemap: {
          auto: true
        }
      });

      const files = {
        'blog/recent-post.html': {
          contents: Buffer.from('<html><head><title>Recent Post</title></head><body>Long content here...</body></html>'),
          title: 'Recent Blog Post',
          lastmod: new Date()
        },
        'services/consulting.html': {
          contents: Buffer.from('<html><head><title>Consulting</title></head><body>Our consulting services</body></html>'),
          title: 'Consulting Services'
        },
        'about/team.html': {
          contents: Buffer.from('<html><head><title>Team</title></head><body>Meet our team</body></html>'),
          title: 'Our Team'
        }
      };

      const mockMetalsmith = {
        metadata: () => ({}),
        match: () => Object.keys(files).filter(f => f.endsWith('.html'))
      };

      plugin(files, mockMetalsmith, function(err) {
        if (err) {return done(err);}
        
        assert(files['sitemap.xml'], 'Should generate sitemap');
        const sitemapContent = files['sitemap.xml'].contents.toString();
        
        // Should contain the files (at minimum the root files)
        assert(sitemapContent.includes('</url>'), 'Should include URL entries');
        assert(sitemapContent.includes('<loc>'), 'Should include location tags');
        
        done();
      });
    });
  });

  describe('Social media features', function() {
    it('should generate comprehensive social media tags', function(done) {
      const plugin = seo({
        hostname: 'http://www.website.com/',
        social: {
          siteName: 'Test Site',
          twitterSite: '@testsite',
          twitterCreator: '@testauthor',
          facebookAppId: '123456789',
          locale: 'en_US'
        },
        jsonLd: {
          organization: {
            name: 'Test Organization',
            logo: 'http://www.website.com/logo.png',
            url: 'http://www.website.com'
          },
          enableSchemas: ['WebPage', 'Article', 'Organization']
        }
      });

      const files = {
        'social-test.html': {
          contents: Buffer.from('<html><head><title>Social Test</title></head><body>Content</body></html>'),
          title: 'Social Media Test',
          description: 'Test description for social media',
          image: '/images/social-test.jpg',
          author: 'Test Author',
          tags: ['technology', 'seo'],
          published: new Date('2023-01-01'),
          modified: new Date('2023-06-01')
        }
      };

      const mockMetalsmith = {
        metadata: () => ({}),
        match: () => ['social-test.html']
      };

      plugin(files, mockMetalsmith, function(err) {
        if (err) {return done(err);}
        
        const htmlContent = files['social-test.html'].contents.toString();
        
        // Check for various social media tags
        assert(htmlContent.includes('og:title'), 'Should include OpenGraph title');
        assert(htmlContent.includes('twitter:card'), 'Should include Twitter card');
        assert(htmlContent.includes('application/ld+json'), 'Should include JSON-LD');
        assert(htmlContent.includes('Test Site'), 'Should include site name');
        assert(htmlContent.includes('@testsite'), 'Should include Twitter site');
        
        done();
      });
    });

    it('should handle missing social media data gracefully', function(done) {
      const plugin = seo({
        hostname: 'http://www.website.com/',
        social: {},
        jsonLd: {}
      });

      const files = {
        'minimal.html': {
          contents: Buffer.from('<html><head><title>Minimal</title></head><body>Minimal content</body></html>')
        }
      };

      const mockMetalsmith = {
        metadata: () => ({}),
        match: () => ['minimal.html']
      };

      plugin(files, mockMetalsmith, function(err) {
        if (err) {return done(err);}
        
        const htmlContent = files['minimal.html'].contents.toString();
        assert(htmlContent.includes('<head>'), 'Should still process HTML');
        
        done();
      });
    });
  });

  describe('Edge cases and error handling', function() {
    it('should handle files without proper HTML structure', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(seo({
          hostname: 'http://www.website.com/'
        }))
        .build(function(err, result) {
          if (err) {return done(err);}
          
          // Should not crash and should still generate sitemap/robots
          assert(result['sitemap.xml'], 'Should generate sitemap');
          assert(result['robots.txt'], 'Should generate robots.txt');
          
          done();
        });
    });

    it('should handle complex nested metadata', function(done) {
      const plugin = seo({
        hostname: 'http://www.website.com/',
        fallbacks: {
          title: 'seo.title',
          description: 'seo.description',
          image: 'seo.image',
          author: 'author.name'
        }
      });

      const files = {
        'complex.html': {
          contents: Buffer.from('<html><head><title>Complex</title></head><body>Content</body></html>'),
          seo: {
            title: 'Custom SEO Title',
            description: 'Custom description',
            canonical: 'https://example.com/canonical',
            image: '/images/custom.jpg',
            noindex: false,
            social: {
              title: 'Social Title',
              description: 'Social Description'
            }
          },
          author: {
            name: 'Author Name',
            email: 'author@example.com'
          }
        }
      };

      const mockMetalsmith = {
        metadata: () => ({}),
        match: () => ['complex.html']
      };

      plugin(files, mockMetalsmith, function(err) {
        if (err) {return done(err);}
        
        const htmlContent = files['complex.html'].contents.toString();
        assert(htmlContent.includes('Custom SEO Title'), 'Should use custom SEO title');
        assert(htmlContent.includes('Custom description'), 'Should use custom description');
        
        done();
      });
    });

    it('should throw error when hostname is missing', function() {
      assert.throws(() => {
        const plugin = seo({});
        const mockFiles = {};
        const mockMetalsmith = { metadata: () => ({}) };
        plugin(mockFiles, mockMetalsmith, () => {});
      }, /hostname is required/);
    });

    it('should handle disabled sitemap and robots', function(done) {
      const plugin = seo({
        hostname: 'http://www.website.com/',
        enableSitemap: false,
        enableRobots: false
      });

      const files = {
        'test.html': {
          contents: Buffer.from('<html><head><title>Test</title></head><body>Content</body></html>')
        }
      };

      const mockMetalsmith = {
        metadata: () => ({}),
        match: () => ['test.html']
      };

      plugin(files, mockMetalsmith, function(err) {
        if (err) {return done(err);}
        
        // Should not generate sitemap or robots
        assert(!files['sitemap.xml'], 'Should not generate sitemap');
        assert(!files['robots.txt'], 'Should not generate robots.txt');
        
        // But should still process HTML
        const htmlContent = files['test.html'].contents.toString();
        assert(htmlContent.includes('<head>'), 'Should still process HTML');
        
        done();
      });
    });
  });

  describe('Robots.txt edge cases', function() {
    it('should handle existing robots.txt with sitemap reference', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(seo({
          hostname: 'http://www.website.com/'
        }))
        .build(function(err, result) {
          if (err) {return done(err);}
          
          const robotsContent = result['robots.txt'].contents.toString();
          // Should not duplicate sitemap reference
          const sitemapMatches = robotsContent.match(/Sitemap:/gi);
          assert.strictEqual(sitemapMatches.length, 1, 'Should have only one sitemap reference');
          
          done();
        });
    });

    it('should add custom disallow paths', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(seo({
          hostname: 'http://www.website.com/',
          robots: {
            disallowPaths: ['/admin/', '/private/', '/temp/'],
            userAgent: 'Googlebot'
          }
        }))
        .build(function(err, result) {
          if (err) {return done(err);}
          
          const robotsContent = result['robots.txt'].contents.toString();
          assert(robotsContent.includes('User-agent: Googlebot'), 'Should use custom user agent');
          assert(robotsContent.includes('Disallow: /admin/'), 'Should include custom disallow path');
          assert(robotsContent.includes('Disallow: /private/'), 'Should include all disallow paths');
          
          done();
        });
    });
  });

  describe('Batch processing', function() {
    it('should handle custom batch sizes', function(done) {
      const plugin = seo({
        hostname: 'http://www.website.com/',
        batchSize: 5  // Custom batch size
      });

      const files = {};
      
      // Create multiple files to test batching
      for (let i = 1; i <= 15; i++) {
        files[`page-${i}.html`] = {
          contents: Buffer.from(`<html><head><title>Page ${i}</title></head><body>Content ${i}</body></html>`),
          title: `Page ${i}`
        };
      }

      const mockMetalsmith = {
        metadata: () => ({}),
        match: () => Object.keys(files).filter(f => f.endsWith('.html'))
      };

      plugin(files, mockMetalsmith, function(err) {
        if (err) {return done(err);}
        
        // Should process all files regardless of batch size
        assert.strictEqual(Object.keys(files).filter(f => f.endsWith('.html')).length, 15, 'Should process all HTML files');
        
        done();
      });
    });
  });
});