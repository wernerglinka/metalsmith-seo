import { describe, it, beforeEach } from 'mocha';
import assert from 'assert';
import { 
  generateMetaTags, 
  metaTagsToHtml, 
  linkTagsToHtml 
} from '../../src/generators/meta-generator.js';

describe('Meta Generator Branch Coverage Tests', function() {
  this.timeout(5000);
  
  beforeEach(function() {
    process.env.NODE_ENV = 'test';
  });

  describe('generateMetaTags branches', function() {
    it('should handle metadata without description', function() {
      const metadata = {
        title: 'Test Title',
        author: 'Test Author'
      };
      
      const result = generateMetaTags(metadata, {});
      
      // Should not add description meta tag
      const descriptionTag = result.metaTags.find(tag => tag.name === 'description');
      assert(!descriptionTag, 'Should not have description tag');
      
      // Should still have other tags
      assert(result.title === 'Test Title', 'Should have title');
      assert(result.metaTags.find(tag => tag.name === 'author'), 'Should have author tag');
    });

    it('should handle keywords as string vs array', function() {
      // Test keywords as array
      const metadataArray = {
        title: 'Test',
        keywords: ['seo', 'metalsmith', 'testing']
      };
      
      const resultArray = generateMetaTags(metadataArray, {});
      const keywordsTagArray = resultArray.metaTags.find(tag => tag.name === 'keywords');
      assert(keywordsTagArray.content === 'seo, metalsmith, testing', 'Should join array keywords');
      
      // Test keywords as string
      const metadataString = {
        title: 'Test',
        keywords: 'seo, metalsmith, testing'
      };
      
      const resultString = generateMetaTags(metadataString, {});
      const keywordsTagString = resultString.metaTags.find(tag => tag.name === 'keywords');
      assert(keywordsTagString.content === 'seo, metalsmith, testing', 'Should use string keywords directly');
    });

    it('should handle empty keywords array', function() {
      const metadata = {
        title: 'Test',
        keywords: []
      };
      
      const result = generateMetaTags(metadata, {});
      const keywordsTag = result.metaTags.find(tag => tag.name === 'keywords');
      assert(!keywordsTag, 'Should not add keywords tag for empty array');
    });

    it('should handle all content types for robots directive', function() {
      // Test article type
      const articleMetadata = { title: 'Article', type: 'article' };
      const articleResult = generateMetaTags(articleMetadata, {});
      const articleRobots = articleResult.metaTags.find(tag => tag.name === 'robots');
      assert(articleRobots.content === 'index,follow', 'Article should have index,follow');
      
      // Test page type
      const pageMetadata = { title: 'Page', type: 'page' };
      const pageResult = generateMetaTags(pageMetadata, {});
      const pageRobots = pageResult.metaTags.find(tag => tag.name === 'robots');
      assert(pageRobots.content === 'index,follow', 'Page should have index,follow');
      
      // Test product type
      const productMetadata = { title: 'Product', type: 'product' };
      const productResult = generateMetaTags(productMetadata, {});
      const productRobots = productResult.metaTags.find(tag => tag.name === 'robots');
      assert(productRobots.content === 'index,follow', 'Product should have index,follow');
      
      // Test unknown type with default robots
      const unknownMetadata = { title: 'Unknown', type: 'unknown' };
      const unknownResult = generateMetaTags(unknownMetadata, { defaultRobots: 'custom,robots' });
      const unknownRobots = unknownResult.metaTags.find(tag => tag.name === 'robots');
      assert(unknownRobots.content === 'custom,robots', 'Unknown type should use site default');
      
      // Test unknown type without default robots
      const unknownResult2 = generateMetaTags(unknownMetadata, {});
      const unknownRobots2 = unknownResult2.metaTags.find(tag => tag.name === 'robots');
      assert(unknownRobots2.content === 'index,follow', 'Unknown type should use fallback default');
    });

    it('should handle noIndex metadata', function() {
      const metadata = {
        title: 'Test',
        noIndex: true,
        type: 'article'
      };
      
      const result = generateMetaTags(metadata, {});
      const robotsTag = result.metaTags.find(tag => tag.name === 'robots');
      assert(robotsTag.content === 'noindex,nofollow', 'noIndex should override type-based robots');
    });

    it('should handle custom robots metadata', function() {
      const metadata = {
        title: 'Test',
        robots: 'noindex,follow',
        type: 'article'
      };
      
      const result = generateMetaTags(metadata, {});
      const robotsTag = result.metaTags.find(tag => tag.name === 'robots');
      assert(robotsTag.content === 'noindex,follow', 'Custom robots should override type-based robots');
    });

    it('should handle all optional site config options', function() {
      const metadata = { title: 'Test' };
      const siteConfig = {
        themeColor: '#ff0000',
        language: 'en-US',
        publisher: 'Test Publisher',
        copyright: '2023 Test Corp',
        maxSnippet: 160,
        maxImagePreview: 'large',
        maxVideoPreview: 30
      };
      
      const result = generateMetaTags(metadata, siteConfig);
      
      // Check all technical meta tags
      assert(result.metaTags.find(tag => tag.name === 'theme-color'), 'Should have theme-color');
      assert(result.metaTags.find(tag => tag.httpEquiv === 'content-language'), 'Should have content-language');
      assert(result.metaTags.find(tag => tag.name === 'publisher'), 'Should have publisher');
      assert(result.metaTags.find(tag => tag.name === 'copyright'), 'Should have copyright');
      
      // Check googlebot directive
      const googlebotTag = result.metaTags.find(tag => tag.name === 'googlebot');
      assert(googlebotTag, 'Should have googlebot tag');
      assert(googlebotTag.content.includes('max-snippet:160'), 'Should have max-snippet');
      assert(googlebotTag.content.includes('max-image-preview:large'), 'Should have max-image-preview');
      assert(googlebotTag.content.includes('max-video-preview:30'), 'Should have max-video-preview');
    });

    it('should handle partial googlebot configurations', function() {
      const metadata = { title: 'Test' };
      
      // Test with only max-snippet
      const siteConfig1 = { maxSnippet: 100 };
      const result1 = generateMetaTags(metadata, siteConfig1);
      const googlebotTag1 = result1.metaTags.find(tag => tag.name === 'googlebot');
      assert(googlebotTag1.content === 'max-snippet:100', 'Should handle single googlebot directive');
      
      // Test with no googlebot configs
      const siteConfig2 = { themeColor: '#ff0000' };
      const result2 = generateMetaTags(metadata, siteConfig2);
      const googlebotTag2 = result2.metaTags.find(tag => tag.name === 'googlebot');
      assert(!googlebotTag2, 'Should not add googlebot tag without directives');
    });

    it('should handle article-specific metadata branches', function() {
      const metadata = {
        title: 'Article',
        type: 'article',
        publishDate: '2023-01-01T00:00:00Z',
        modifiedDate: '2023-06-01T00:00:00Z',
        author: 'John Doe',
        keywords: ['tech', 'article']
      };
      
      const result = generateMetaTags(metadata, {});
      
      // Check article-specific tags
      assert(result.metaTags.find(tag => tag.name === 'article:published_time'), 'Should have published time');
      assert(result.metaTags.find(tag => tag.name === 'article:modified_time'), 'Should have modified time');
      assert(result.metaTags.find(tag => tag.name === 'article:author'), 'Should have article author');
      
      // Check article tags for keywords
      const articleTags = result.metaTags.filter(tag => tag.name === 'article:tag');
      assert(articleTags.length === 2, 'Should have article tags for each keyword');
      assert(articleTags[0].content === 'tech', 'First article tag should be tech');
      assert(articleTags[1].content === 'article', 'Second article tag should be article');
    });

    it('should handle article metadata without optional fields', function() {
      const metadata = {
        title: 'Article',
        type: 'article'
        // No publishDate, modifiedDate, author, or keywords
      };
      
      const result = generateMetaTags(metadata, {});
      
      // Should not add article-specific tags when data is missing
      assert(!result.metaTags.find(tag => tag.name === 'article:published_time'), 'Should not have published time');
      assert(!result.metaTags.find(tag => tag.name === 'article:modified_time'), 'Should not have modified time');
      assert(!result.metaTags.find(tag => tag.name === 'article:author'), 'Should not have article author');
      assert(!result.metaTags.find(tag => tag.name === 'article:tag'), 'Should not have article tags');
    });

    it('should handle metadata without canonical URL', function() {
      const metadata = {
        title: 'Test'
        // No canonicalURL
      };
      
      const result = generateMetaTags(metadata, {});
      assert(result.linkTags.length === 0, 'Should not have any link tags without canonical URL');
    });

    it('should handle metadata without author', function() {
      const metadata = {
        title: 'Test'
        // No author
      };
      
      const result = generateMetaTags(metadata, {});
      const authorTag = result.metaTags.find(tag => tag.name === 'author');
      assert(!authorTag, 'Should not have author tag');
    });

    it('should handle keywords falsy values', function() {
      // Test null keywords
      const nullResult = generateMetaTags({ title: 'Test', keywords: null }, {});
      const nullKeywordsTag = nullResult.metaTags.find(tag => tag.name === 'keywords');
      assert(!nullKeywordsTag, 'Should not have keywords tag when null');
      
      // Test undefined keywords
      const undefinedResult = generateMetaTags({ title: 'Test', keywords: undefined }, {});
      const undefinedKeywordsTag = undefinedResult.metaTags.find(tag => tag.name === 'keywords');
      assert(!undefinedKeywordsTag, 'Should not have keywords tag when undefined');
      
      // Test false keywords
      const falseResult = generateMetaTags({ title: 'Test', keywords: false }, {});
      const falseKeywordsTag = falseResult.metaTags.find(tag => tag.name === 'keywords');
      assert(!falseKeywordsTag, 'Should not have keywords tag when false');
    });

    it('should handle robots directive returning null', function() {
      // Test scenario where robots directive returns null (no conditions met)
      const metadata = {
        title: 'Test'
        // No noIndex, no robots, no type, and no defaultRobots in siteConfig
      };
      
      const result = generateMetaTags(metadata, {});
      const robotsTag = result.metaTags.find(tag => tag.name === 'robots');
      
      // Should still have robots tag with default value
      assert(robotsTag && robotsTag.content === 'index,follow', 'Should have default robots value');
    });

    it('should test noIndex false path', function() {
      const metadata = {
        title: 'Test',
        noIndex: false,
        robots: 'custom,directive'
      };
      
      const result = generateMetaTags(metadata, {});
      const robotsTag = result.metaTags.find(tag => tag.name === 'robots');
      
      // Should use custom robots instead of noindex
      assert(robotsTag.content === 'custom,directive', 'Should use custom robots when noIndex is false');
    });

    it('should test robots metadata false path', function() {
      const metadata = {
        title: 'Test',
        robots: '', // Empty string (falsy)
        type: 'article'
      };
      
      const result = generateMetaTags(metadata, {});
      const robotsTag = result.metaTags.find(tag => tag.name === 'robots');
      
      // Should fall through to type-based default
      assert(robotsTag.content === 'index,follow', 'Should use type-based default when robots is falsy');
    });

    it('should handle missing individual site config values', function() {
      // Test missing language
      const noLanguageResult = generateMetaTags({ title: 'Test' }, { publisher: 'Test Pub' });
      const languageTag = noLanguageResult.metaTags.find(tag => tag.httpEquiv === 'content-language');
      assert(!languageTag, 'Should not have content-language when language missing');
      
      // Test missing publisher  
      const noPublisherResult = generateMetaTags({ title: 'Test' }, { language: 'en' });
      const publisherTag = noPublisherResult.metaTags.find(tag => tag.name === 'publisher');
      assert(!publisherTag, 'Should not have publisher when missing');
      
      // Test missing copyright
      const noCopyrightResult = generateMetaTags({ title: 'Test' }, { language: 'en' });
      const copyrightTag = noCopyrightResult.metaTags.find(tag => tag.name === 'copyright');
      assert(!copyrightTag, 'Should not have copyright when missing');
    });

    it('should handle individual Googlebot directive presence/absence', function() {
      // Test only maxSnippet
      const snippetOnlyResult = generateMetaTags({ title: 'Test' }, { maxSnippet: 100 });
      const snippetGooglebotTag = snippetOnlyResult.metaTags.find(tag => tag.name === 'googlebot');
      assert(snippetGooglebotTag.content === 'max-snippet:100', 'Should have only max-snippet');
      
      // Test only maxImagePreview
      const imageOnlyResult = generateMetaTags({ title: 'Test' }, { maxImagePreview: 'large' });
      const imageGooglebotTag = imageOnlyResult.metaTags.find(tag => tag.name === 'googlebot');
      assert(imageGooglebotTag.content === 'max-image-preview:large', 'Should have only max-image-preview');
      
      // Test only maxVideoPreview
      const videoOnlyResult = generateMetaTags({ title: 'Test' }, { maxVideoPreview: 30 });
      const videoGooglebotTag = videoOnlyResult.metaTags.find(tag => tag.name === 'googlebot');
      assert(videoGooglebotTag.content === 'max-video-preview:30', 'Should have only max-video-preview');
      
      // Test combination of two
      const twoDirectivesResult = generateMetaTags({ title: 'Test' }, { 
        maxSnippet: 150, 
        maxImagePreview: 'standard'
      });
      const twoGooglebotTag = twoDirectivesResult.metaTags.find(tag => tag.name === 'googlebot');
      assert(twoGooglebotTag.content === 'max-snippet:150,max-image-preview:standard', 'Should combine two directives');
    });

    it('should handle article with missing individual fields', function() {
      // Test article with only publishDate
      const onlyPublishResult = generateMetaTags({
        title: 'Article',
        type: 'article',
        publishDate: '2023-01-01'
      }, {});
      
      const publishTag = onlyPublishResult.metaTags.find(tag => tag.name === 'article:published_time');
      const modifiedTag = onlyPublishResult.metaTags.find(tag => tag.name === 'article:modified_time');
      const authorTag = onlyPublishResult.metaTags.find(tag => tag.name === 'article:author');
      const tagTags = onlyPublishResult.metaTags.filter(tag => tag.name === 'article:tag');
      
      assert(publishTag, 'Should have published time');
      assert(!modifiedTag, 'Should not have modified time');
      assert(!authorTag, 'Should not have article author');
      assert(tagTags.length === 0, 'Should not have article tags');
      
      // Test article with only modifiedDate
      const onlyModifiedResult = generateMetaTags({
        title: 'Article',
        type: 'article',
        modifiedDate: '2023-06-01'
      }, {});
      
      const modOnlyTag = onlyModifiedResult.metaTags.find(tag => tag.name === 'article:modified_time');
      assert(modOnlyTag, 'Should have only modified time');
      
      // Test article with only author
      const onlyAuthorResult = generateMetaTags({
        title: 'Article',
        type: 'article',
        author: 'Test Author'
      }, {});
      
      const authorOnlyTag = onlyAuthorResult.metaTags.find(tag => tag.name === 'article:author');
      assert(authorOnlyTag, 'Should have only article author');
    });
  });

  describe('metaTagsToHtml branches', function() {
    it('should handle meta tags with all attribute types', function() {
      const metaTags = [
        { name: 'description', content: 'Test description' },
        { property: 'og:title', content: 'Test title' },
        { httpEquiv: 'content-language', content: 'en-US' },
        { content: 'Orphaned content' } // No name/property/httpEquiv
      ];
      
      const html = metaTagsToHtml(metaTags);
      
      assert(html.includes('name="description"'), 'Should handle name attribute');
      assert(html.includes('property="og:title"'), 'Should handle property attribute');
      assert(html.includes('http-equiv="content-language"'), 'Should handle httpEquiv attribute');
      assert(html.includes('content="Orphaned content"'), 'Should handle content-only tags');
    });

    it('should handle meta tags with missing specific attributes', function() {
      // Test missing name
      const noNameTag = [{ property: 'og:test', content: 'value' }];
      const noNameHtml = metaTagsToHtml(noNameTag);
      assert(!noNameHtml.includes('name='), 'Should not include name attribute when missing');
      assert(noNameHtml.includes('property="og:test"'), 'Should include other attributes');
      
      // Test missing property
      const noPropertyTag = [{ name: 'test', content: 'value' }];
      const noPropertyHtml = metaTagsToHtml(noPropertyTag);
      assert(!noPropertyHtml.includes('property='), 'Should not include property attribute when missing');
      assert(noPropertyHtml.includes('name="test"'), 'Should include other attributes');
      
      // Test missing httpEquiv
      const noHttpEquivTag = [{ name: 'test', content: 'value' }];
      const noHttpEquivHtml = metaTagsToHtml(noHttpEquivTag);
      assert(!noHttpEquivHtml.includes('http-equiv='), 'Should not include http-equiv when missing');
      
      // Test missing content
      const noContentTag = [{ name: 'test' }];
      const noContentHtml = metaTagsToHtml(noContentTag);
      assert(!noContentHtml.includes('content='), 'Should not include content attribute when missing');
      assert(noContentHtml.includes('name="test"'), 'Should include other attributes');
    });

    it('should handle meta tags missing content', function() {
      const metaTags = [
        { name: 'test' }
        // No content
      ];
      
      const html = metaTagsToHtml(metaTags);
      assert(html.includes('name="test"'), 'Should handle tags without content');
      assert(!html.includes('content='), 'Should not include content attribute when missing');
    });

    it('should handle HTML escaping in meta tags', function() {
      const metaTags = [
        { name: 'test<script>', content: 'Value with "quotes" & <tags>' }
      ];
      
      const html = metaTagsToHtml(metaTags);
      assert(html.includes('name="test&lt;script&gt;"'), 'Should escape name attribute');
      assert(html.includes('content="Value with &quot;quotes&quot; &amp; &lt;tags&gt;"'), 'Should escape content attribute');
    });
  });

  describe('linkTagsToHtml branches', function() {
    it('should handle link tags with all standard attributes', function() {
      const linkTags = [
        { rel: 'canonical', href: 'https://example.com' },
        { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon', sizes: '16x16' },
        { rel: 'stylesheet', href: '/style.css', custom: 'attribute' }
      ];
      
      const html = linkTagsToHtml(linkTags);
      
      assert(html.includes('rel="canonical"'), 'Should handle rel attribute');
      assert(html.includes('href="https://example.com"'), 'Should handle href attribute');
      assert(html.includes('type="image/x-icon"'), 'Should handle type attribute');
      assert(html.includes('sizes="16x16"'), 'Should handle sizes attribute');
      assert(html.includes('custom="attribute"'), 'Should handle custom attributes');
    });

    it('should handle link tags with missing standard attributes', function() {
      // Test missing rel
      const noRelTag = [{ href: 'https://example.com', type: 'text/css' }];
      const noRelHtml = linkTagsToHtml(noRelTag);
      assert(!noRelHtml.includes('rel='), 'Should not include rel when missing');
      assert(noRelHtml.includes('href="https://example.com"'), 'Should include other attributes');
      
      // Test missing href
      const noHrefTag = [{ rel: 'stylesheet', type: 'text/css' }];
      const noHrefHtml = linkTagsToHtml(noHrefTag);
      assert(!noHrefHtml.includes('href='), 'Should not include href when missing');
      assert(noHrefHtml.includes('rel="stylesheet"'), 'Should include other attributes');
      
      // Test missing type
      const noTypeTag = [{ rel: 'canonical', href: 'https://example.com' }];
      const noTypeHtml = linkTagsToHtml(noTypeTag);
      assert(!noTypeHtml.includes('type='), 'Should not include type when missing');
      
      // Test missing sizes
      const noSizesTag = [{ rel: 'icon', href: '/favicon.ico' }];
      const noSizesHtml = linkTagsToHtml(noSizesTag);
      assert(!noSizesHtml.includes('sizes='), 'Should not include sizes when missing');
    });

    it('should handle link tags with custom attributes beyond standard ones', function() {
      const linkTags = [
        { 
          rel: 'stylesheet', 
          href: '/style.css',
          integrity: 'sha256-abc123',
          crossorigin: 'anonymous',
          media: 'screen',
          hreflang: 'en',
          'data-custom': 'value'
        }
      ];
      
      const html = linkTagsToHtml(linkTags);
      
      // Should include standard attributes
      assert(html.includes('rel="stylesheet"'), 'Should include rel');
      assert(html.includes('href="/style.css"'), 'Should include href');
      
      // Should include custom attributes (processed by Object.entries loop)
      assert(html.includes('integrity="sha256-abc123"'), 'Should include integrity attribute');
      assert(html.includes('crossorigin="anonymous"'), 'Should include crossorigin attribute');
      assert(html.includes('media="screen"'), 'Should include media attribute');
      assert(html.includes('hreflang="en"'), 'Should include hreflang attribute');
      assert(html.includes('data-custom="value"'), 'Should include data attributes');
    });

    it('should not duplicate standard attributes in custom attributes loop', function() {
      const linkTags = [
        { 
          rel: 'canonical', 
          href: 'https://example.com',
          type: 'text/html',
          sizes: '16x16',
          custom: 'value'
        }
      ];
      
      const html = linkTagsToHtml(linkTags);
      
      // Count occurrences to ensure no duplication
      const relMatches = (html.match(/rel=/g) || []).length;
      const hrefMatches = (html.match(/href=/g) || []).length;
      const typeMatches = (html.match(/type=/g) || []).length;
      const sizesMatches = (html.match(/sizes=/g) || []).length;
      
      assert(relMatches === 1, 'Should have exactly one rel attribute');
      assert(hrefMatches === 1, 'Should have exactly one href attribute');
      assert(typeMatches === 1, 'Should have exactly one type attribute');
      assert(sizesMatches === 1, 'Should have exactly one sizes attribute');
      assert(html.includes('custom="value"'), 'Should include custom attribute');
    });

    it('should handle link tags with only custom attributes', function() {
      const linkTags = [
        { custom: 'only' } // No standard attributes
      ];
      
      const html = linkTagsToHtml(linkTags);
      assert(html.includes('custom="only"'), 'Should handle custom-only attributes');
    });

    it('should handle HTML escaping in link tags', function() {
      const linkTags = [
        { 
          rel: 'test<script>', 
          href: 'https://example.com?param="value"&other=<test>',
          custom: 'Value with "quotes" & <tags>'
        }
      ];
      
      const html = linkTagsToHtml(linkTags);
      assert(html.includes('rel="test&lt;script&gt;"'), 'Should escape rel attribute');
      assert(html.includes('href="https://example.com?param=&quot;value&quot;&amp;other=&lt;test&gt;"'), 'Should escape href attribute');
      assert(html.includes('custom="Value with &quot;quotes&quot; &amp; &lt;tags&gt;"'), 'Should escape custom attributes');
    });
  });

  describe('escapeHtml function branches', function() {
    it('should handle non-string inputs', function() {
      // Test the escapeHtml function directly through metaTagsToHtml
      const metaTags = [
        { name: 'number', content: 123 },
        { name: 'boolean', content: true }
      ];
      
      const html = metaTagsToHtml(metaTags);
      
      assert(html.includes('content="123"'), 'Should convert number to string');
      assert(html.includes('content="true"'), 'Should convert boolean to string');
    });

    it('should handle zero as falsy content', function() {
      // Zero is falsy so it won't get a content attribute
      const metaTags = [
        { name: 'zero-test', content: 0 }
      ];
      
      const html = metaTagsToHtml(metaTags);
      assert(html.includes('name="zero-test"'), 'Should have name for zero content');
      assert(!html.includes('content="0"'), 'Zero should be treated as falsy and not get content attribute');
    });

    it('should handle falsy content values', function() {
      // Test that falsy values don't get content attribute
      const metaTags = [
        { name: 'null-test', content: null },
        { name: 'undefined-test', content: undefined },
        { name: 'empty-test', content: '' }
      ];
      
      const html = metaTagsToHtml(metaTags);
      
      // These should not have content attributes or should have empty content
      assert(html.includes('name="null-test"'), 'Should have name for null content');
      assert(html.includes('name="undefined-test"'), 'Should have name for undefined content');
      assert(html.includes('name="empty-test"'), 'Should have name for empty content');
    });

    it('should handle escaping edge cases', function() {
      // Test all special characters together
      const metaTags = [
        { name: 'all-chars', content: '&<>"\'test' }
      ];
      
      const html = metaTagsToHtml(metaTags);
      assert(html.includes('content="&amp;&lt;&gt;&quot;&#39;test"'), 'Should escape all special characters');
    });

    it('should handle empty string inputs', function() {
      const metaTags = [
        { name: 'empty-content', content: '' }
      ];
      
      const html = metaTagsToHtml(metaTags);
      assert(html.includes('name="empty-content"'), 'Should handle meta tag with empty content');
      // Empty content should still get a content attribute
      assert(html.includes('content=""') || !html.includes('content='), 'Should handle empty string content correctly');
    });
  });
});