import { describe, it, beforeEach } from 'mocha';
import assert from 'assert';
import { 
  generateOpenGraphTags, 
  openGraphTagsToHtml 
} from '../../src/generators/opengraph-generator.js';

describe('OpenGraph Generator Branch Coverage Tests', function() {
  this.timeout(5000);
  
  beforeEach(function() {
    process.env.NODE_ENV = 'test';
  });

  describe('generateOpenGraphTags branches', function() {
    it('should handle metadata without title', function() {
      const metadata = {
        description: 'Test description',
        type: 'article'
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      // Should not add og:title when no title
      const titleTag = result.metaTags.find(tag => tag.property === 'og:title');
      assert(!titleTag, 'Should not have og:title tag');
      
      // Should still have other tags
      assert(result.metaTags.find(tag => tag.property === 'og:type'), 'Should have og:type tag');
    });

    it('should handle metadata without canonical URL', function() {
      const metadata = {
        title: 'Test Title',
        type: 'article'
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      // Should not add og:url when no canonicalURL
      const urlTag = result.metaTags.find(tag => tag.property === 'og:url');
      assert(!urlTag, 'Should not have og:url tag');
    });

    it('should handle metadata without description', function() {
      const metadata = {
        title: 'Test Title',
        type: 'article'
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      // Should not add og:description when no description
      const descriptionTag = result.metaTags.find(tag => tag.property === 'og:description');
      assert(!descriptionTag, 'Should not have og:description tag');
    });

    it('should handle metadata without image', function() {
      const metadata = {
        title: 'Test Title',
        type: 'article'
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      // Should not add image tags when no image
      const imageTag = result.metaTags.find(tag => tag.property === 'og:image');
      assert(!imageTag, 'Should not have og:image tag');
      
      const imageWidthTag = result.metaTags.find(tag => tag.property === 'og:image:width');
      assert(!imageWidthTag, 'Should not have image metadata tags');
    });

    it('should handle site config without siteName', function() {
      const metadata = {
        title: 'Test Title',
        type: 'article'
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      // Should not add og:site_name when no siteName
      const siteNameTag = result.metaTags.find(tag => tag.property === 'og:site_name');
      assert(!siteNameTag, 'Should not have og:site_name tag');
    });

    it('should handle all content type branches', function() {
      // Test article type
      const articleResult = generateOpenGraphTags({ title: 'Article', type: 'article' }, {});
      const articleTypeTag = articleResult.metaTags.find(tag => tag.property === 'og:type');
      assert(articleTypeTag.content === 'article', 'Article type should map to article');
      
      // Test product type
      const productResult = generateOpenGraphTags({ title: 'Product', type: 'product' }, {});
      const productTypeTag = productResult.metaTags.find(tag => tag.property === 'og:type');
      assert(productTypeTag.content === 'product', 'Product type should map to product');
      
      // Test profile type
      const profileResult = generateOpenGraphTags({ title: 'Profile', type: 'profile' }, {});
      const profileTypeTag = profileResult.metaTags.find(tag => tag.property === 'og:type');
      assert(profileTypeTag.content === 'profile', 'Profile type should map to profile');
      
      // Test page type
      const pageResult = generateOpenGraphTags({ title: 'Page', type: 'page' }, {});
      const pageTypeTag = pageResult.metaTags.find(tag => tag.property === 'og:type');
      assert(pageTypeTag.content === 'website', 'Page type should map to website');
      
      // Test local-business type
      const businessResult = generateOpenGraphTags({ title: 'Business', type: 'local-business' }, {});
      const businessTypeTag = businessResult.metaTags.find(tag => tag.property === 'og:type');
      assert(businessTypeTag.content === 'business.business', 'Local-business should map to business.business');
      
      // Test unknown type
      const unknownResult = generateOpenGraphTags({ title: 'Unknown', type: 'unknown' }, {});
      const unknownTypeTag = unknownResult.metaTags.find(tag => tag.property === 'og:type');
      assert(unknownTypeTag.content === 'website', 'Unknown type should default to website');
      
      // Test undefined type
      const undefinedResult = generateOpenGraphTags({ title: 'Undefined' }, {});
      const undefinedTypeTag = undefinedResult.metaTags.find(tag => tag.property === 'og:type');
      assert(undefinedTypeTag.content === 'website', 'Undefined type should default to website');
    });

    it('should handle locale preferences in site config', function() {
      // Test with explicit locale
      const localeResult = generateOpenGraphTags({ title: 'Test' }, { locale: 'fr_FR' });
      const localeTag = localeResult.metaTags.find(tag => tag.property === 'og:locale');
      assert(localeTag.content === 'fr_FR', 'Should use explicit locale');
      
      // Test with language fallback
      const langResult = generateOpenGraphTags({ title: 'Test' }, { language: 'es-ES' });
      const langTag = langResult.metaTags.find(tag => tag.property === 'og:locale');
      assert(langTag.content === 'es-ES', 'Should use language as locale fallback');
      
      // Test with default fallback
      const defaultResult = generateOpenGraphTags({ title: 'Test' }, {});
      const defaultTag = defaultResult.metaTags.find(tag => tag.property === 'og:locale');
      assert(defaultTag.content === 'en_US', 'Should use default locale');
    });

    it('should handle image metadata with custom dimensions', function() {
      const metadata = {
        title: 'Test',
        image: '/test.jpg',
        imageAlt: 'Custom alt text'
      };
      const siteConfig = {
        ogImageWidth: 800,
        ogImageHeight: 400
      };
      
      const result = generateOpenGraphTags(metadata, siteConfig);
      
      const widthTag = result.metaTags.find(tag => tag.property === 'og:image:width');
      const heightTag = result.metaTags.find(tag => tag.property === 'og:image:height');
      const altTag = result.metaTags.find(tag => tag.property === 'og:image:alt');
      
      assert(widthTag.content === '800', 'Should use custom width');
      assert(heightTag.content === '400', 'Should use custom height');
      assert(altTag.content === 'Custom alt text', 'Should use custom alt text');
    });

    it('should handle image metadata with defaults', function() {
      const metadata = {
        title: 'Test Title',
        image: '/test.jpg'
        // No imageAlt
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      const widthTag = result.metaTags.find(tag => tag.property === 'og:image:width');
      const heightTag = result.metaTags.find(tag => tag.property === 'og:image:height');
      const altTag = result.metaTags.find(tag => tag.property === 'og:image:alt');
      
      assert(widthTag.content === '1200', 'Should use default width');
      assert(heightTag.content === '630', 'Should use default height');
      assert(altTag.content === 'Test Title', 'Should use title as alt fallback');
    });

    it('should handle image type detection for all supported formats', function() {
      const formats = [
        { url: '/test.jpg', expected: 'image/jpeg' },
        { url: '/test.jpeg', expected: 'image/jpeg' },
        { url: '/test.png', expected: 'image/png' },
        { url: '/test.gif', expected: 'image/gif' },
        { url: '/test.webp', expected: 'image/webp' },
        { url: '/test.svg', expected: 'image/svg+xml' },
        { url: '/test.JPG', expected: 'image/jpeg' }, // Test case sensitivity
        { url: '/test.unknown', expected: null },
        { url: '/test', expected: null } // No extension
      ];
      
      formats.forEach(({ url, expected }) => {
        const result = generateOpenGraphTags({ title: 'Test', image: url }, {});
        const typeTag = result.metaTags.find(tag => tag.property === 'og:image:type');
        
        if (expected) {
          assert(typeTag && typeTag.content === expected, `Image ${url} should have type ${expected}`);
        } else {
          assert(!typeTag, `Image ${url} should not have type tag`);
        }
      });
    });

    it('should handle article-specific tags with all metadata', function() {
      const metadata = {
        title: 'Article Title',
        type: 'article',
        publishDate: '2023-01-01T00:00:00Z',
        modifiedDate: '2023-06-01T00:00:00Z',
        author: 'John Doe',
        section: 'Technology',
        keywords: ['tech', 'article', 'seo'],
        readingTime: '5 minutes'
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      // Check all article-specific tags
      assert(result.metaTags.find(tag => tag.property === 'article:published_time'), 'Should have published time');
      assert(result.metaTags.find(tag => tag.property === 'article:modified_time'), 'Should have modified time');
      assert(result.metaTags.find(tag => tag.property === 'article:author'), 'Should have author');
      assert(result.metaTags.find(tag => tag.property === 'article:section'), 'Should have section');
      assert(result.metaTags.find(tag => tag.property === 'article:reading_time'), 'Should have reading time');
      
      // Check article tags for keywords
      const articleTags = result.metaTags.filter(tag => tag.property === 'article:tag');
      assert(articleTags.length === 3, 'Should have 3 article tags');
      assert(articleTags.some(tag => tag.content === 'tech'), 'Should have tech tag');
      assert(articleTags.some(tag => tag.content === 'article'), 'Should have article tag');
      assert(articleTags.some(tag => tag.content === 'seo'), 'Should have seo tag');
    });

    it('should handle article-specific tags with missing metadata', function() {
      const metadata = {
        title: 'Article Title',
        type: 'article'
        // Missing all optional article fields
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      // Should not add article-specific tags when data is missing
      assert(!result.metaTags.find(tag => tag.property === 'article:published_time'), 'Should not have published time');
      assert(!result.metaTags.find(tag => tag.property === 'article:modified_time'), 'Should not have modified time');
      assert(!result.metaTags.find(tag => tag.property === 'article:author'), 'Should not have article author');
      assert(!result.metaTags.find(tag => tag.property === 'article:section'), 'Should not have section');
      assert(!result.metaTags.find(tag => tag.property === 'article:tag'), 'Should not have article tags');
      assert(!result.metaTags.find(tag => tag.property === 'article:reading_time'), 'Should not have reading time');
    });

    it('should handle empty keywords array for articles', function() {
      const metadata = {
        title: 'Article Title',
        type: 'article',
        keywords: []
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      const articleTags = result.metaTags.filter(tag => tag.property === 'article:tag');
      assert(articleTags.length === 0, 'Should not add article tags for empty keywords');
    });

    it('should handle product-specific tags with all metadata', function() {
      const metadata = {
        title: 'Product Title',
        type: 'product',
        brand: 'Test Brand',
        availability: 'in stock',
        condition: 'new',
        price: 99.99,
        currency: 'USD'
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      // Check all product-specific tags
      const brandTag = result.metaTags.find(tag => tag.property === 'product:brand');
      const availabilityTag = result.metaTags.find(tag => tag.property === 'product:availability');
      const conditionTag = result.metaTags.find(tag => tag.property === 'product:condition');
      const priceTag = result.metaTags.find(tag => tag.property === 'product:price:amount');
      const currencyTag = result.metaTags.find(tag => tag.property === 'product:price:currency');
      
      assert(brandTag && brandTag.content === 'Test Brand', 'Should have brand tag');
      assert(availabilityTag && availabilityTag.content === 'in stock', 'Should have availability tag');
      assert(conditionTag && conditionTag.content === 'new', 'Should have condition tag');
      assert(priceTag && priceTag.content === '99.99', 'Should have price tag');
      assert(currencyTag && currencyTag.content === 'USD', 'Should have currency tag');
    });

    it('should handle product-specific tags with missing metadata', function() {
      const metadata = {
        title: 'Product Title',
        type: 'product'
        // Missing all optional product fields
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      // Should not add product-specific tags when data is missing
      assert(!result.metaTags.find(tag => tag.property === 'product:brand'), 'Should not have brand');
      assert(!result.metaTags.find(tag => tag.property === 'product:availability'), 'Should not have availability');
      assert(!result.metaTags.find(tag => tag.property === 'product:condition'), 'Should not have condition');
      assert(!result.metaTags.find(tag => tag.property === 'product:price:amount'), 'Should not have price');
      assert(!result.metaTags.find(tag => tag.property === 'product:price:currency'), 'Should not have currency');
    });

    it('should handle profile-specific tags with all metadata', function() {
      const metadata = {
        title: 'Profile Title',
        type: 'profile',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe'
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      // Check all profile-specific tags
      const firstNameTag = result.metaTags.find(tag => tag.property === 'profile:first_name');
      const lastNameTag = result.metaTags.find(tag => tag.property === 'profile:last_name');
      const usernameTag = result.metaTags.find(tag => tag.property === 'profile:username');
      
      assert(firstNameTag && firstNameTag.content === 'John', 'Should have first name tag');
      assert(lastNameTag && lastNameTag.content === 'Doe', 'Should have last name tag');
      assert(usernameTag && usernameTag.content === 'johndoe', 'Should have username tag');
    });

    it('should handle profile-specific tags with missing metadata', function() {
      const metadata = {
        title: 'Profile Title',
        type: 'profile'
        // Missing all optional profile fields
      };
      
      const result = generateOpenGraphTags(metadata, {});
      
      // Should not add profile-specific tags when data is missing
      assert(!result.metaTags.find(tag => tag.property === 'profile:first_name'), 'Should not have first name');
      assert(!result.metaTags.find(tag => tag.property === 'profile:last_name'), 'Should not have last name');
      assert(!result.metaTags.find(tag => tag.property === 'profile:username'), 'Should not have username');
    });

    it('should handle Facebook app ID and admins', function() {
      const siteConfig = {
        facebookAppId: '123456789',
        facebookAdmins: ['admin1', 'admin2']
      };
      
      const result = generateOpenGraphTags({ title: 'Test' }, siteConfig);
      
      const appIdTag = result.metaTags.find(tag => tag.property === 'fb:app_id');
      const adminTags = result.metaTags.filter(tag => tag.property === 'fb:admins');
      
      assert(appIdTag && appIdTag.content === '123456789', 'Should have Facebook app ID');
      assert(adminTags.length === 2, 'Should have 2 admin tags');
      assert(adminTags.some(tag => tag.content === 'admin1'), 'Should have admin1');
      assert(adminTags.some(tag => tag.content === 'admin2'), 'Should have admin2');
    });

    it('should handle single Facebook admin', function() {
      const siteConfig = {
        facebookAdmins: 'single_admin'
      };
      
      const result = generateOpenGraphTags({ title: 'Test' }, siteConfig);
      
      const adminTags = result.metaTags.filter(tag => tag.property === 'fb:admins');
      
      assert(adminTags.length === 1, 'Should have 1 admin tag');
      assert(adminTags[0].content === 'single_admin', 'Should have single admin');
    });

    it('should handle missing Facebook configuration', function() {
      const result = generateOpenGraphTags({ title: 'Test' }, {});
      
      const appIdTag = result.metaTags.find(tag => tag.property === 'fb:app_id');
      const adminTags = result.metaTags.filter(tag => tag.property === 'fb:admins');
      
      assert(!appIdTag, 'Should not have Facebook app ID');
      assert(adminTags.length === 0, 'Should not have admin tags');
    });
  });

  describe('openGraphTagsToHtml branches', function() {
    it('should handle HTML escaping in OpenGraph tags', function() {
      const metaTags = [
        { 
          property: 'og:title<script>', 
          content: 'Title with "quotes" & <tags>' 
        },
        {
          property: 'og:description',
          content: 'Description with \'single quotes\' and &amp; entities'
        }
      ];
      
      const html = openGraphTagsToHtml(metaTags);
      
      assert(html.includes('property="og:title&lt;script&gt;"'), 'Should escape property attribute');
      assert(html.includes('content="Title with &quot;quotes&quot; &amp; &lt;tags&gt;"'), 'Should escape content attribute');
      assert(html.includes('content="Description with &#39;single quotes&#39; and &amp;amp; entities"'), 'Should escape single quotes and existing entities');
    });

    it('should handle non-string values in tags', function() {
      const metaTags = [
        { property: 'og:price', content: 99.99 },
        { property: 'og:available', content: true },
        { property: 'og:count', content: 0 }
      ];
      
      const html = openGraphTagsToHtml(metaTags);
      
      assert(html.includes('content="99.99"'), 'Should convert number to string');
      assert(html.includes('content="true"'), 'Should convert boolean to string');
      assert(html.includes('content="0"'), 'Should convert zero to string');
    });

    it('should handle empty meta tags array', function() {
      const html = openGraphTagsToHtml([]);
      assert(html === '', 'Should return empty string for empty array');
    });

    it('should join multiple tags with newlines', function() {
      const metaTags = [
        { property: 'og:title', content: 'Title' },
        { property: 'og:description', content: 'Description' }
      ];
      
      const html = openGraphTagsToHtml(metaTags);
      const lines = html.split('\n');
      
      assert(lines.length === 2, 'Should have 2 lines');
      assert(lines[0].includes('og:title'), 'First line should have title');
      assert(lines[1].includes('og:description'), 'Second line should have description');
    });
  });
});