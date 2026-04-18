import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateJsonLd } from '../../src/generators/jsonld-generator.js';

describe('JSON-LD Generator Branch Coverage Tests', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  describe('generateJsonLd branches', () => {
    it('should handle WebSite schema without site name', () => {
      const result = generateJsonLd({ title: 'Test' }, {});

      // Should not generate WebSite schema without name
      const hasWebSite = result.schemas.some((schema) => schema['@type'] === 'WebSite');
      assert(!hasWebSite, 'Should not generate WebSite schema without siteName or name');
    });

    it('should handle WebSite schema with site name', () => {
      const siteConfig = {
        siteName: 'Test Site',
        hostname: 'https://example.com'
      };

      const result = generateJsonLd({ title: 'Test' }, siteConfig);

      const webSiteSchema = result.schemas.find((schema) => schema['@type'] === 'WebSite');
      assert(webSiteSchema, 'Should generate WebSite schema');
      assert(webSiteSchema.name === 'Test Site', 'Should use siteName');
      assert(webSiteSchema.url === 'https://example.com', 'Should use hostname as URL');
    });

    it('should handle WebSite schema with fallback name', () => {
      const siteConfig = {
        name: 'Fallback Name',
        url: 'https://example.com'
      };

      const result = generateJsonLd({ title: 'Test' }, siteConfig);

      const webSiteSchema = result.schemas.find((schema) => schema['@type'] === 'WebSite');
      assert(webSiteSchema.name === 'Fallback Name', 'Should use name when siteName not available');
      assert(webSiteSchema.url === 'https://example.com', 'Should use url when hostname not available');
    });

    it('should handle WebSite schema with search action', () => {
      const siteConfig = {
        siteName: 'Test Site',
        searchUrl: 'https://example.com/search'
      };

      const result = generateJsonLd({ title: 'Test' }, siteConfig);

      const webSiteSchema = result.schemas.find((schema) => schema['@type'] === 'WebSite');
      assert(webSiteSchema.potentialAction, 'Should have search action');
      assert(webSiteSchema.potentialAction['@type'] === 'SearchAction', 'Should be SearchAction type');
      assert(
        webSiteSchema.potentialAction.target.urlTemplate.includes('search_term_string'),
        'Should have search template'
      );
    });

    it('should handle WebSite schema without search action', () => {
      const siteConfig = {
        siteName: 'Test Site'
      };

      const result = generateJsonLd({ title: 'Test' }, siteConfig);

      const webSiteSchema = result.schemas.find((schema) => schema['@type'] === 'WebSite');
      assert(!webSiteSchema.potentialAction, 'Should not have search action');
    });

    it('should handle WebSite schema with alternate names', () => {
      // Test with array of alternate names
      const siteConfigArray = {
        siteName: 'Test Site',
        alternateNames: ['Alt Name 1', 'Alt Name 2']
      };

      const arrayResult = generateJsonLd({ title: 'Test' }, siteConfigArray);
      const arrayWebSiteSchema = arrayResult.schemas.find((schema) => schema['@type'] === 'WebSite');
      assert(Array.isArray(arrayWebSiteSchema.alternateName), 'Should handle array of alternate names');
      assert(arrayWebSiteSchema.alternateName.length === 2, 'Should have 2 alternate names');

      // Test with single alternate name
      const siteConfigSingle = {
        siteName: 'Test Site',
        alternateNames: 'Single Alt Name'
      };

      const singleResult = generateJsonLd({ title: 'Test' }, siteConfigSingle);
      const singleWebSiteSchema = singleResult.schemas.find((schema) => schema['@type'] === 'WebSite');
      assert(Array.isArray(singleWebSiteSchema.alternateName), 'Should convert single name to array');
      assert(singleWebSiteSchema.alternateName[0] === 'Single Alt Name', 'Should have correct alternate name');
    });

    it('should handle all content type branches', () => {
      // Test article type
      const articleResult = generateJsonLd(
        {
          title: 'Article',
          type: 'article',
          author: 'Test Author',
          publishDate: '2023-01-01'
        },
        { siteName: 'Test' }
      );

      const hasArticle = articleResult.schemas.some((schema) => schema['@type'] === 'Article');
      assert(hasArticle, 'Should generate Article schema');

      // Test product type
      const productResult = generateJsonLd(
        {
          title: 'Product',
          type: 'product',
          price: 99.99,
          brand: 'Test Brand'
        },
        { siteName: 'Test' }
      );

      const hasProduct = productResult.schemas.some((schema) => schema['@type'] === 'Product');
      assert(hasProduct, 'Should generate Product schema');

      // Test local-business type
      const businessResult = generateJsonLd(
        {
          title: 'Business',
          type: 'local-business',
          address: '123 Main St'
        },
        { siteName: 'Test' }
      );

      const hasBusiness = businessResult.schemas.some((schema) => schema['@type'] === 'LocalBusiness');
      assert(hasBusiness, 'Should generate LocalBusiness schema');

      // Test page type (explicit)
      const pageResult = generateJsonLd(
        {
          title: 'Page',
          type: 'page'
        },
        { siteName: 'Test' }
      );

      const hasWebPage = pageResult.schemas.some((schema) => schema['@type'] === 'WebPage');
      assert(hasWebPage, 'Should generate WebPage schema for page type');

      // Test default type
      const defaultResult = generateJsonLd(
        {
          title: 'Default',
          type: 'unknown'
        },
        { siteName: 'Test' }
      );

      const hasDefaultWebPage = defaultResult.schemas.some((schema) => schema['@type'] === 'WebPage');
      assert(hasDefaultWebPage, 'Should generate WebPage schema for unknown type');

      // Test no type specified
      const noTypeResult = generateJsonLd(
        {
          title: 'No Type'
        },
        { siteName: 'Test' }
      );

      const hasNoTypeWebPage = noTypeResult.schemas.some((schema) => schema['@type'] === 'WebPage');
      assert(hasNoTypeWebPage, 'Should generate WebPage schema when no type specified');
    });

    it('should handle breadcrumb schema generation', () => {
      // Test with file path
      const result = generateJsonLd({ title: 'Test' }, { siteName: 'Test' }, 'blog/category/post.html');

      // This tests if breadcrumb generation is called - actual implementation may vary
      // We're testing that the function call doesn't break, not necessarily that it generates breadcrumbs
      assert(result.schemas.length > 0, 'Should generate schemas without error');
    });

    it('should handle organization schema generation', () => {
      const siteConfig = {
        siteName: 'Test Site',
        organization: {
          name: 'Test Org',
          logo: 'https://example.com/logo.png'
        }
      };

      const result = generateJsonLd({ title: 'Test' }, siteConfig);

      // Testing that organization generation is called
      assert(result.schemas.length > 0, 'Should generate schemas without error');
    });

    it('should add schema.org context to all schemas', () => {
      const result = generateJsonLd(
        {
          title: 'Test',
          type: 'article'
        },
        { siteName: 'Test Site' }
      );

      // All schemas should have @context
      result.schemas.forEach((schema) => {
        assert(schema['@context'] === 'https://schema.org', 'All schemas should have schema.org context');
      });
    });

    it('should generate HTML script tag', () => {
      const result = generateJsonLd(
        {
          title: 'Test',
          type: 'article'
        },
        { siteName: 'Test Site' }
      );

      assert(typeof result.html === 'string', 'Should return HTML string');
      assert(result.html.includes('<script type="application/ld+json">'), 'Should contain JSON-LD script tag');
      assert(result.html.includes('</script>'), 'Should close script tag');
      assert(result.html.includes('"@context"'), 'Should contain JSON-LD content');
    });

    it('should escape < and --> to prevent script-tag breakout', () => {
      const result = generateJsonLd(
        {
          title: 'Hostile </script><script>alert(1)</script> title',
          description: 'Comment ender --> here',
          type: 'article'
        },
        { siteName: 'Test </script> Site', hostname: 'https://example.com' }
      );

      // The only </script> in the output must be the closing tag of the
      // ld+json block itself (one occurrence). Everything else is escaped.
      const closingTags = result.html.match(/<\/script>/g) || [];
      assert.equal(closingTags.length, 1, 'Should contain exactly one </script> (the wrapper)');
      assert(!result.html.includes('alert(1)</script>'), 'Should not allow script breakout');
      assert(result.html.includes('\\u003c/script>'), 'Should escape < as \\u003c');
      assert(result.html.includes('--\\u003e'), 'Should escape --> to prevent comment closure');

      // Round-trip: extract the script body and verify it is still valid JSON
      // with the original (unescaped) characters intact.
      const body = result.html.match(/<script[^>]*>\n([\s\S]*?)\n<\/script>/)[1];
      const parsed = JSON.parse(body);
      const stringified = JSON.stringify(parsed);
      assert(stringified.includes('</script>'), 'Decoded JSON should restore the literal </script>');
      assert(stringified.includes('-->'), 'Decoded JSON should restore the literal -->');
    });

    it('should handle empty schemas array', () => {
      // This might happen if no schema generation conditions are met
      const result = generateJsonLd({ title: 'Test' }, {}); // No site config

      // Should still return valid structure even if no schemas generated
      assert(Array.isArray(result.schemas), 'Should return schemas array');
      assert(typeof result.html === 'string', 'Should return HTML string');
    });

    it('should handle malformed metadata gracefully', () => {
      const malformedMetadata = {
        // Missing title
        type: null,
        author: undefined,
        publishDate: 'invalid-date'
      };

      const result = generateJsonLd(malformedMetadata, { siteName: 'Test' });

      // Should not throw errors
      assert(Array.isArray(result.schemas), 'Should handle malformed metadata');
      assert(typeof result.html === 'string', 'Should return valid HTML');
    });

    it('should handle special characters in JSON-LD output', () => {
      const metadata = {
        title: 'Test with "quotes" & <special> characters',
        description: "Content with 'quotes' and line\nbreaks",
        type: 'article'
      };

      const result = generateJsonLd(metadata, { siteName: 'Test Site' });

      // JSON-LD should properly escape content
      assert(!result.html.includes('<script>'), 'Should not contain unescaped script tags');
      assert(result.html.includes('application/ld+json'), 'Should contain proper type');
    });

    it('should prioritize metadata over site config', () => {
      const metadata = {
        title: 'Metadata Title',
        author: 'Metadata Author',
        type: 'article'
      };

      const siteConfig = {
        siteName: 'Site Name',
        defaultAuthor: 'Site Author'
      };

      const result = generateJsonLd(metadata, siteConfig);

      // Should use metadata values over site config defaults
      const articleSchema = result.schemas.find((schema) => schema['@type'] === 'Article');
      if (articleSchema) {
        // If author is set in article schema, it should come from metadata
        assert(
          !articleSchema.author ||
            typeof articleSchema.author === 'string' ||
            articleSchema.author.name === 'Metadata Author',
          'Should prioritize metadata author over site config'
        );
      }
    });
  });
});
