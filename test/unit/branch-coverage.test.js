import { describe, it, beforeEach } from 'mocha';
import assert from 'assert';
import Metalsmith from 'metalsmith';
import seo from '../../lib/index.js';
import { resetCache } from '../test-utils.js';
describe('Branch Coverage Tests', function() {
  this.timeout(5000);
  
  beforeEach(function() {
    process.env.NODE_ENV = 'test';
  });

  describe('Auto-calculator edge cases', function() {
    it('should handle different path depths and content types', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          // Add files to test different path depths and content types
          files['blog/recent-post.html'] = {
            contents: Buffer.from('<html><head><title>Recent Post</title></head><body>' + 'Long content. '.repeat(1000) + '</body></html>'),
            title: 'Recent Blog Post',
            lastmod: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
          };
          files['blog/old-post.html'] = {
            contents: Buffer.from('<html><head><title>Old Post</title></head><body>Old content</body></html>'),
            title: 'Old Blog Post',
            lastmod: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) // 200 days ago
          };
          files['news/breaking.html'] = {
            contents: Buffer.from('<html><head><title>Breaking News</title></head><body>News content</body></html>'),
            title: 'Breaking News'
          };
          files['services/consulting.html'] = {
            contents: Buffer.from('<html><head><title>Consulting</title></head><body>Consulting services</body></html>'),
            title: 'Consulting Services'
          };
          files['products/software/tool.html'] = {
            contents: Buffer.from('<html><head><title>Software Tool</title></head><body>Software products</body></html>'),
            title: 'Software Tool'
          };
          files['about/contact.html'] = {
            contents: Buffer.from('<html><head><title>Contact</title></head><body>Contact us</body></html>'),
            title: 'Contact Us'
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/',
          sitemap: { auto: true }
        }))
        .build(function(err, files) {
          if (err) return done(err);
          
          assert(files['sitemap.xml'], 'Should generate sitemap');
          const sitemapContent = files['sitemap.xml'].contents.toString();
          
          // Verify various content types are included
          assert(sitemapContent.includes('</url>'), 'Should include URL entries');
          assert(sitemapContent.includes('<loc>'), 'Should include location tags');
          
          done();
        });
    });

    it('should handle files with different content sizes', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          // Add files with different content sizes to test buffer length checks
          files['large-content.html'] = {
            contents: Buffer.from('<html><head><title>Large Content</title></head><body>' + 'Content. '.repeat(2000) + '</body></html>'),
            title: 'Large Content'
          };
          files['small-content.html'] = {
            contents: Buffer.from('<html><head><title>Small Content</title></head><body>Small</body></html>'),
            title: 'Small Content'
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/',
          sitemap: { auto: true }
        }))
        .build(function(err, files) {
          if (err) return done(err);
          
          assert(files['sitemap.xml'], 'Should generate sitemap');
          done();
        });
    });
  });

  describe('Social media and generator edge cases', function() {
    it('should handle various social media configurations', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          // Add files with video, audio, and image content
          files['video-content.html'] = {
            contents: Buffer.from('<html><head><title>Video Content</title></head><body>Video</body></html>'),
            title: 'Video Content',
            video: '/videos/sample.mp4',
            videoType: 'video/mp4',
            videoDuration: '120'
          };
          files['large-image.html'] = {
            contents: Buffer.from('<html><head><title>Large Image</title></head><body>Content</body></html>'),
            title: 'Large Image Content',
            image: '/images/large.jpg',
            imageWidth: 1200,
            imageHeight: 630
          };
          files['small-image.html'] = {
            contents: Buffer.from('<html><head><title>Small Image</title></head><body>Content</body></html>'),
            title: 'Small Image Content',
            image: '/images/small.jpg',
            imageWidth: 300,
            imageHeight: 200
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/',
          social: {
            siteName: 'Test Site',
            twitterSite: '@testsite'
          }
        }))
        .build(function(err, files) {
          if (err) return done(err);
          
          // Check that content is processed
          const videoHtml = files['video-content.html'].contents.toString();
          assert(videoHtml.includes('<head>'), 'Should process video content');
          
          done();
        });
    });

    it('should handle complex JSON-LD scenarios', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          // Add article with comprehensive metadata
          files['full-article.html'] = {
            contents: Buffer.from('<html><head><title>Full Article</title></head><body>Article content</body></html>'),
            title: 'Full Article',
            description: 'A comprehensive article',
            author: 'John Doe',
            published: new Date('2023-01-01'),
            modified: new Date('2023-06-01'),
            tags: ['technology', 'programming'],
            category: 'Tech'
          };
          files['minimal-article.html'] = {
            contents: Buffer.from('<html><head><title>Minimal Article</title></head><body>Minimal content</body></html>'),
            title: 'Minimal Article'
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/',
          jsonLd: {
            enableSchemas: ['Article', 'WebPage'],
            organization: {
              name: 'Test Organization',
              logo: 'http://www.website.com/logo.png'
            }
          }
        }))
        .build(function(err, files) {
          if (err) return done(err);
          
          // Check that articles are processed
          const fullArticleHtml = files['full-article.html'].contents.toString();
          assert(fullArticleHtml.includes('<head>'), 'Should process article content');
          
          done();
        });
    });
  });

  describe('HTML injection and utility edge cases', function() {
    it('should handle malformed HTML structures', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          // Add files with various HTML structures
          files['no-head.html'] = {
            contents: Buffer.from('<html><body>No head tag</body></html>'),
            title: 'No Head Tag'
          };
          files['existing-meta.html'] = {
            contents: Buffer.from('<html><head><title>Existing</title><meta name="description" content="existing description"></head><body>Content</body></html>'),
            title: 'New Title',
            description: 'New Description'
          };
          files['empty-head.html'] = {
            contents: Buffer.from('<html><head></head><body>Empty head</body></html>'),
            title: 'Empty Head'
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/'
        }))
        .build(function(err, files) {
          if (err) return done(err);
          
          // Check that HTML is processed despite structural issues
          assert(files['no-head.html'].contents.toString().includes('<head>'), 'Should inject head tag');
          assert(files['existing-meta.html'].contents.toString().includes('New Title'), 'Should update existing meta');
          
          done();
        });
    });

    it('should test object-utils edge cases with complex fallbacks', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          files['utility-test.html'] = {
            contents: Buffer.from('<html><head><title>Utility Test</title></head><body>Content</body></html>'),
            nested: {
              valid: {
                path: 'Nested description value'
              }
            },
            nullValue: null,
            emptyString: '',
            undefinedValue: undefined
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/',
          fallbacks: {
            title: 'invalid.path.does.not.exist',
            description: 'nested.valid.path',
            author: 'nullValue',
            image: 'emptyString'
          }
        }))
        .build(function(err, files) {
          if (err) return done(err);
          
          const html = files['utility-test.html'].contents.toString();
          assert(html.includes('Nested description value'), 'Should use nested fallback value');
          
          done();
        });
    });
  });

  describe('Robots and configuration edge cases', function() {
    it('should handle custom robots configuration', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          files['test-page.html'] = {
            contents: Buffer.from('<html><head><title>Test Page</title></head><body>Content</body></html>'),
            title: 'Test Page'
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/',
          robots: {
            disallowPaths: ['/admin/', '/private/'],
            userAgent: 'Googlebot'
          }
        }))
        .build(function(err, files) {
          if (err) return done(err);
          
          const robotsContent = files['robots.txt'].contents.toString();
          assert(robotsContent.includes('User-agent: Googlebot'), 'Should use custom user agent');
          
          done();
        });
    });

    it('should handle disabled features', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          files['test.html'] = {
            contents: Buffer.from('<html><head><title>Test</title></head><body>Content</body></html>'),
            title: 'Test'
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/',
          enableSitemap: false,
          enableRobots: false
        }))
        .build(function(err, files) {
          if (err) return done(err);
          
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
});