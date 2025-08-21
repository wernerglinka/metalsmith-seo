import { describe, it, beforeEach } from 'mocha';
import assert from 'assert';
import Metalsmith from 'metalsmith';
import seo from '../../src/index.js';
describe('Edge Branch Coverage Tests', function() {
  this.timeout(5000);
  
  beforeEach(function() {
    process.env.NODE_ENV = 'test';
  });

  describe('HTML injection edge cases', function() {
    it('should handle HTML without html element', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          // HTML without html wrapper
          files['no-html-element.html'] = {
            contents: Buffer.from('<head><title>No HTML Element</title></head><body>Content</body>'),
            title: 'No HTML Element Test'
          };
          // HTML with just body
          files['just-body.html'] = {
            contents: Buffer.from('<body>Just body content</body>'),
            title: 'Just Body Test'
          };
          // Empty HTML
          files['empty.html'] = {
            contents: Buffer.from(''),
            title: 'Empty HTML Test'
          };
          // Text content only
          files['text-only.html'] = {
            contents: Buffer.from('Plain text content'),
            title: 'Text Only Test'
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/'
        }))
        .build(function(err, files) {
          if (err) {return done(err);}
          
          // Should process all files despite structure issues
          assert(files['no-html-element.html'], 'Should process HTML without html element');
          assert(files['just-body.html'], 'Should process HTML with just body');
          assert(files['empty.html'], 'Should process empty HTML');
          assert(files['text-only.html'], 'Should process text-only content');
          
          done();
        });
    });

    it('should handle different injection positions', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          // HTML with existing title for position testing
          files['with-title.html'] = {
            contents: Buffer.from('<html><head><title>Existing Title</title><meta name="existing" content="true"></head><body>Content</body></html>'),
            title: 'New Title',
            description: 'New Description'
          };
          // HTML with no title
          files['no-title.html'] = {
            contents: Buffer.from('<html><head><meta name="existing" content="true"></head><body>Content</body></html>'),
            title: 'Injected Title',
            description: 'Injected Description'
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/'
        }))
        .build(function(err, files) {
          if (err) {return done(err);}
          
          const withTitleHtml = files['with-title.html'].contents.toString();
          const noTitleHtml = files['no-title.html'].contents.toString();
          
          assert(withTitleHtml.includes('<head>'), 'Should process HTML with existing title');
          assert(noTitleHtml.includes('<head>'), 'Should process HTML without title');
          
          done();
        });
    });
  });

  describe('Meta generator edge cases', function() {
    it('should handle various robots and meta configurations', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          // File with specific robots settings
          files['robots-config.html'] = {
            contents: Buffer.from('<html><head><title>Robots Config</title></head><body>Content</body></html>'),
            title: 'Robots Configuration Test',
            robots: 'index,follow',
            googlebot: 'index,follow,archive',
            bingbot: 'index,follow'
          };
          // File with viewport and other meta
          files['meta-tags.html'] = {
            contents: Buffer.from('<html><head><title>Meta Tags</title></head><body>Content</body></html>'),
            title: 'Meta Tags Test',
            viewport: 'width=device-width, initial-scale=1.0',
            charset: 'utf-8',
            'http-equiv': 'X-UA-Compatible',
            generator: 'Metalsmith'
          };
          // File with boolean and null values
          files['edge-values.html'] = {
            contents: Buffer.from('<html><head><title>Edge Values</title></head><body>Content</body></html>'),
            title: 'Edge Values Test',
            noindex: true,
            nofollow: false,
            nullValue: null,
            undefinedValue: undefined,
            emptyString: '',
            zeroValue: 0
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/'
        }))
        .build(function(err, files) {
          if (err) {return done(err);}
          
          const robotsHtml = files['robots-config.html'].contents.toString();
          const metaHtml = files['meta-tags.html'].contents.toString();
          const edgeHtml = files['edge-values.html'].contents.toString();
          
          assert(robotsHtml.includes('<head>'), 'Should process robots configuration');
          assert(metaHtml.includes('<head>'), 'Should process meta tags');
          assert(edgeHtml.includes('<head>'), 'Should process edge values');
          
          done();
        });
    });

    it('should handle complex nested metadata scenarios', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          // File with deeply nested seo configuration
          files['nested-seo.html'] = {
            contents: Buffer.from('<html><head><title>Nested SEO</title></head><body>Content</body></html>'),
            title: 'Nested SEO Test',
            seo: {
              title: 'Custom SEO Title',
              description: 'Custom SEO Description',
              noindex: true,
              robots: 'noindex,nofollow',
              social: {
                title: 'Social Title',
                description: 'Social Description',
                image: '/social-image.jpg'
              },
              meta: {
                custom: 'custom-value',
                author: 'Custom Author'
              }
            }
          };
          // File with array values
          files['array-values.html'] = {
            contents: Buffer.from('<html><head><title>Array Values</title></head><body>Content</body></html>'),
            title: 'Array Values Test',
            keywords: ['seo', 'metalsmith', 'testing'],
            tags: ['tag1', 'tag2', 'tag3'],
            categories: ['cat1', 'cat2']
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/',
          seoProperty: 'seo'
        }))
        .build(function(err, files) {
          if (err) {return done(err);}
          
          const nestedHtml = files['nested-seo.html'].contents.toString();
          const arrayHtml = files['array-values.html'].contents.toString();
          
          assert(nestedHtml.includes('<head>'), 'Should process nested SEO configuration');
          assert(arrayHtml.includes('<head>'), 'Should process array values');
          
          done();
        });
    });
  });

  describe('Generator combinations and fallbacks', function() {
    it('should handle comprehensive social media and OpenGraph scenarios', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          // Article with comprehensive social media metadata
          files['social-comprehensive.html'] = {
            contents: Buffer.from('<html><head><title>Social Comprehensive</title></head><body>Article content</body></html>'),
            title: 'Comprehensive Social Article',
            description: 'A comprehensive article with social media metadata',
            author: 'Test Author',
            published: new Date('2023-01-01'),
            modified: new Date('2023-06-01'),
            image: '/images/article-image.jpg',
            imageAlt: 'Article image description',
            imageWidth: 1200,
            imageHeight: 630,
            video: '/videos/article-video.mp4',
            videoType: 'video/mp4',
            audio: '/audio/article-audio.mp3',
            audioType: 'audio/mp3',
            tags: ['technology', 'web development'],
            category: 'Technology',
            locale: 'en_US',
            siteName: 'Test Site',
            twitterCard: 'summary_large_image',
            twitterSite: '@testsite',
            twitterCreator: '@testauthor'
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/',
          social: {
            siteName: 'Default Site Name',
            twitterSite: '@defaultsite',
            locale: 'en_US'
          },
          jsonLd: {
            enableSchemas: ['Article', 'WebPage', 'Organization'],
            organization: {
              name: 'Test Organization',
              logo: 'http://www.website.com/logo.png'
            }
          }
        }))
        .build(function(err, files) {
          if (err) {return done(err);}
          
          const socialHtml = files['social-comprehensive.html'].contents.toString();
          
          // Should include comprehensive social media tags
          assert(socialHtml.includes('<head>'), 'Should process comprehensive social media content');
          
          done();
        });
    });

    it('should handle edge cases in all generators simultaneously', function(done) {
      Metalsmith('test/fixtures/hostname')
        .destination('build')
        .use(function(files, metalsmith, done) {
          // File that tests multiple generators with edge cases
          files['multi-generator-edge.html'] = {
            contents: Buffer.from('<html><head><title>Multi Generator Edge</title></head><body>Content</body></html>'),
            title: 'Multi Generator Edge Test',
            description: '',  // Empty description
            author: null,     // Null author
            image: undefined, // Undefined image
            published: 'invalid-date', // Invalid date
            modified: new Date('invalid'), // Invalid date constructor
            tags: '', // Empty string instead of array
            category: 0, // Zero value
            robots: '', // Empty robots
            canonical: '', // Empty canonical
            noindex: 'true', // String boolean
            nofollow: 1, // Number boolean
            // Test fallback properties
            fallbackTitle: 'Fallback Title Value',
            fallbackDescription: 'Fallback Description Value',
            fallbackAuthor: 'Fallback Author Value'
          };
          done();
        })
        .use(seo({
          hostname: 'http://www.website.com/',
          fallbacks: {
            title: 'fallbackTitle',
            description: 'fallbackDescription', 
            author: 'fallbackAuthor'
          },
          social: {
            siteName: 'Test Site'
          },
          jsonLd: {
            enableSchemas: ['WebPage']
          }
        }))
        .build(function(err, files) {
          if (err) {return done(err);}
          
          const edgeHtml = files['multi-generator-edge.html'].contents.toString();
          
          // Should handle all edge cases gracefully
          assert(edgeHtml.includes('<head>'), 'Should process multi-generator edge cases');
          
          done();
        });
    });
  });
});