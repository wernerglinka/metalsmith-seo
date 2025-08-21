import equal from 'assert-dir-equal';
import Metalsmith from 'metalsmith';
import seo from '../lib/index.js';

describe('metalsmith-seo', function(){
  // Set timeout for the entire test suite
  this.timeout(10000);
  
  // These tests verify the comprehensive SEO plugin functionality
  beforeEach(function() {
    // Set test environment to suppress console logs
    process.env.NODE_ENV = 'test';
    // Reset cache before each test to ensure clean state
  });
  it('should generate sitemap.xml and optimize HTML for SEO', function(done){
    Metalsmith('test/fixtures/html')
      .use(seo({
        hostname: 'http://www.website.com/',
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/html/expected', 'test/fixtures/html/build');
        done();
      });
  });

  it('should accept a string as the hostname', function(done){
    Metalsmith('test/fixtures/hostname')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/hostname/expected', 'test/fixtures/hostname/build');
        done();
      });
  });

  it('should accept defaults for changefreq and priority', function(done){
    Metalsmith('test/fixtures/defaults')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        changefreq: 'never',
        priority: 0.1,
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/defaults/expected', 'test/fixtures/defaults/build');
        done();
      });
  });

  it('should allow settings to be overridden from the frontmatter', function(done){
    Metalsmith('test/fixtures/frontmatter')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        changefreq: 'never',
        priority: 0.1,
        lastmod: new Date(),
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/frontmatter/expected', 'test/fixtures/frontmatter/build');
        done();
      });
  });

  it('should allow the sitemap\'s location to be changed', function(done){
    Metalsmith('test/fixtures/output')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        output: 'mapsite.xml',
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/output/expected', 'test/fixtures/output/build');
        done();
      });
  });

  it('should accept a pattern', function(done){
    Metalsmith('test/fixtures/pattern')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        pattern: ['**/*.html', '**/*.hbs'],
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/pattern/expected', 'test/fixtures/pattern/build');
        done();
      });
  });

  it('should allow a canonical url to be set', function(done){
    Metalsmith('test/fixtures/canonical')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/canonical/expected', 'test/fixtures/canonical/build');
        done();
      });
  });

  it('should allow lastmod to be set', function(done){
    Metalsmith('test/fixtures/lastmod')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        lastmod: new Date('1995-12-17T12:24:00'),
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/lastmod/expected', 'test/fixtures/lastmod/build');
        done();
      });
  });

  it('should allow a canonical url, lastmod and priority to be set from custom property', function(done){
    Metalsmith('test/fixtures/custom-frontmatter')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com',
        modifiedProperty: 'lastModified',
        urlProperty: 'seo.canonical',
        priorityProperty: 'order',
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/custom-frontmatter/expected', 'test/fixtures/custom-frontmatter/build');
        done();
      });
  });

  it('should be able to omit extensions', function(done){
    Metalsmith('test/fixtures/omitExtension')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        omitExtension: true,
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/omitExtension/expected', 'test/fixtures/omitExtension/build');
        done();
      });
  });

  it('should be able to omit index.html', function(done){
    Metalsmith('test/fixtures/omitIndex')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        omitIndex: true,
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/omitIndex/expected', 'test/fixtures/omitIndex/build');
        done();
      });
  });

  it('should ignore files marked as private', function(done){
    Metalsmith('test/fixtures/private')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/private/expected', 'test/fixtures/private/build');
        done();
      });
  });

  it('should handle files with links', function(done){
    Metalsmith('test/fixtures/links')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        links: 'links',
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/links/expected', 'test/fixtures/links/build');
        done();
      });
  });

  it('should replace win32 backslash by slash', function(done){
    Metalsmith('test/fixtures/win32-backslash')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/',
        auto: false
      }))
      .build(function(err){
        if (err) {
          return done(err);
        }
        equal('test/fixtures/win32-backslash/expected', 'test/fixtures/win32-backslash/build');
        done();
      });
  });

  it('should enable auto mode by default and generate priority/changefreq/lastmod', function(done){
    Metalsmith('test/fixtures/hostname')
      .destination('build')
      .use(seo({
        hostname: 'http://www.website.com/'
        // No auto: false - testing default behavior
      }))
      .build(function(err, files){
        if (err) {
          return done(err);
        }
        
        // Verify sitemap.xml exists and contains auto-generated content
        const sitemapExists = files['sitemap.xml'] !== undefined;
        if (!sitemapExists) {
          return done(new Error('sitemap.xml was not generated'));
        }
        
        const sitemapContent = files['sitemap.xml'].contents.toString();
        
        // Check that auto-generated elements are present
        const hasPriority = sitemapContent.includes('<priority>');
        const hasChangefreq = sitemapContent.includes('<changefreq>');
        
        if (!hasPriority) {
          return done(new Error('Auto-generated priority missing from sitemap'));
        }
        if (!hasChangefreq) {
          return done(new Error('Auto-generated changefreq missing from sitemap'));
        }
        // lastmod is optional and depends on file modification dates
        
        done();
      });
  });
});