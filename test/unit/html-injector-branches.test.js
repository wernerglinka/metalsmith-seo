import { describe, it, beforeEach } from 'mocha';
import assert from 'assert';
import {
  injectIntoHead,
  updateTitle,
  updateMetaTag,
  updateLinkTag,
  addScript,
  removeExistingMetaTags
} from '../../src/utils/html-injector.js';

describe('HTML Injector Branch Coverage Tests', function() {
  this.timeout(5000);
  
  beforeEach(function() {
    process.env.NODE_ENV = 'test';
  });

  describe('injectIntoHead branches', function() {
    it('should handle HTML without html element when creating head', function() {
      const html = '<body>Content</body>';
      const result = injectIntoHead(html, '<meta name="test" content="value">', {
        createHead: true
      });
      
      assert(result.includes('<head>'), 'Should create head element');
      assert(result.includes('<meta name="test" content="value">'), 'Should inject content');
    });

    it('should handle HTML with html element when creating head', function() {
      const html = '<html><body>Content</body></html>';
      const result = injectIntoHead(html, '<meta name="test" content="value">', {
        createHead: true
      });
      
      assert(result.includes('<head>'), 'Should create head element in html');
      assert(result.includes('<meta name="test" content="value">'), 'Should inject content');
    });

    it('should handle HTML without head when createHead is false', function() {
      // Note: Cheerio automatically adds head tag to incomplete HTML
      // This test verifies the function handles the case properly  
      const html = '<body>Content</body>';
      const result = injectIntoHead(html, '<meta name="test" content="value">', {
        createHead: false,
        ensureTitle: false
      });
      
      // Cheerio will add HTML structure, but content should still be injected
      assert(result.includes('<head>'), 'Cheerio adds head element to incomplete HTML');
      assert(result.includes('<meta name="test" content="value">'), 'Should inject content into Cheerio-created head');
      assert(result.includes('<body>Content</body>'), 'Should preserve body content');
    });

    it('should create title when ensureTitle is true and no title exists', function() {
      const html = '<head></head><body>Content</body>';
      const result = injectIntoHead(html, '<meta name="test" content="value">', {
        ensureTitle: true
      });
      
      assert(result.includes('<title></title>'), 'Should create empty title tag');
    });

    it('should not create title when ensureTitle is false', function() {
      const html = '<head></head><body>Content</body>';
      const result = injectIntoHead(html, '<meta name="test" content="value">', {
        ensureTitle: false
      });
      
      assert(!result.includes('<title>'), 'Should not create title tag');
    });

    it('should handle all injection positions', function() {
      const htmlWithTitle = '<head><title>Test</title><meta name="existing" content="test"></head>';
      const content = '<meta name="test" content="value">';
      
      // Test start position
      const startResult = injectIntoHead(htmlWithTitle, content, { position: 'start' });
      const startIndex = startResult.indexOf('<meta name="test"');
      const titleIndex = startResult.indexOf('<title>');
      assert(startIndex < titleIndex, 'Start position should inject before title');
      
      // Test before-title position with title present
      const beforeTitleResult = injectIntoHead(htmlWithTitle, content, { position: 'before-title' });
      assert(beforeTitleResult.includes('<meta name="test" content="value"><title>'), 'Should inject before title');
      
      // Test after-title position with title present
      const afterTitleResult = injectIntoHead(htmlWithTitle, content, { position: 'after-title' });
      assert(afterTitleResult.includes('</title><meta name="test" content="value">'), 'Should inject after title');
      
      // Test end position (default)
      const endResult = injectIntoHead(htmlWithTitle, content, { position: 'end' });
      const endTestIndex = endResult.lastIndexOf('<meta name="test"');
      const endExistingIndex = endResult.lastIndexOf('<meta name="existing"');
      assert(endTestIndex > endExistingIndex, 'End position should inject after existing content');
    });

    it('should handle before-title position when no title exists', function() {
      const html = '<head><meta name="existing" content="test"></head>';
      const content = '<meta name="test" content="value">';
      
      const result = injectIntoHead(html, content, { position: 'before-title' });
      const testIndex = result.indexOf('<meta name="test"');
      const existingIndex = result.indexOf('<meta name="existing"');
      assert(testIndex < existingIndex, 'Should prepend when no title exists');
    });

    it('should handle after-title position when no title exists', function() {
      const html = '<head><meta name="existing" content="test"></head>';
      const content = '<meta name="test" content="value">';
      
      const result = injectIntoHead(html, content, { position: 'after-title' });
      
      // When ensureTitle=true (default), it creates title first, then adds content after title
      assert(result.includes('<title></title>'), 'Should create title when ensureTitle is true');
      
      const titleEndIndex = result.indexOf('</title>');
      const testIndex = result.indexOf('<meta name="test"');
      assert(testIndex > titleEndIndex, 'Should place content after the created title');
    });

    it('should handle invalid position as default end', function() {
      const html = '<head><meta name="existing" content="test"></head>';
      const content = '<meta name="test" content="value">';
      
      const result = injectIntoHead(html, content, { position: 'invalid' });
      const testIndex = result.indexOf('<meta name="test"');
      const existingIndex = result.indexOf('<meta name="existing"');
      assert(testIndex > existingIndex, 'Invalid position should default to end');
    });
  });

  describe('updateTitle branches', function() {
    it('should create head when none exists', function() {
      const html = '<body>Content</body>';
      const result = updateTitle(html, 'New Title');
      
      assert(result.includes('<head>'), 'Should create head element');
      assert(result.includes('<title>New Title</title>'), 'Should add title');
    });

    it('should update existing title', function() {
      const html = '<head><title>Old Title</title></head>';
      const result = updateTitle(html, 'New Title');
      
      assert(result.includes('<title>New Title</title>'), 'Should update existing title');
      assert(!result.includes('Old Title'), 'Should not contain old title');
    });

    it('should create title when head exists but no title', function() {
      const html = '<head><meta name="test" content="value"></head>';
      const result = updateTitle(html, 'New Title');
      
      assert(result.includes('<title>New Title</title>'), 'Should create title');
      assert(result.indexOf('<title>') < result.indexOf('<meta'), 'Should prepend title');
    });

    it('should escape HTML in title', function() {
      const html = '<head></head>';
      const result = updateTitle(html, 'Title with <script> & "quotes"');
      
      // Cheerio escapes < > & but leaves quotes as-is in text content
      assert(result.includes('Title with &lt;script&gt; &amp; "quotes"'), 'Should escape HTML in title');
    });
  });

  describe('updateMetaTag branches', function() {
    it('should create head when none exists', function() {
      const html = '<body>Content</body>';
      const result = updateMetaTag(html, 'description', 'Test description');
      
      assert(result.includes('<head>'), 'Should create head element');
      assert(result.includes('<meta name="description" content="Test description">'), 'Should add meta tag');
    });

    it('should update existing meta tag', function() {
      const html = '<head><meta name="description" content="Old description"></head>';
      const result = updateMetaTag(html, 'description', 'New description');
      
      assert(result.includes('content="New description"'), 'Should update content');
      assert(!result.includes('Old description'), 'Should not contain old content');
    });

    it('should handle different attribute types', function() {
      const html = '<head></head>';
      
      // Test property type
      const propertyResult = updateMetaTag(html, 'og:title', 'Test Title', 'property');
      assert(propertyResult.includes('<meta property="og:title"'), 'Should handle property type');
      
      // Test http-equiv type
      const httpResult = updateMetaTag('<head></head>', 'refresh', '30', 'http-equiv');
      assert(httpResult.includes('<meta http-equiv="refresh"'), 'Should handle http-equiv type');
    });

    it('should insert after existing meta tags when no title', function() {
      const html = '<head><meta name="existing" content="test"><link rel="stylesheet"></head>';
      const result = updateMetaTag(html, 'description', 'Test description');
      
      const existingIndex = result.indexOf('<meta name="existing"');
      const newIndex = result.indexOf('<meta name="description"');
      assert(newIndex > existingIndex, 'Should insert after existing meta tags');
    });

    it('should insert after title when no meta tags exist', function() {
      const html = '<head><title>Test</title><link rel="stylesheet"></head>';
      const result = updateMetaTag(html, 'description', 'Test description');
      
      const titleIndex = result.indexOf('</title>');
      const metaIndex = result.indexOf('<meta name="description"');
      assert(metaIndex > titleIndex, 'Should insert after title');
    });

    it('should prepend when no title or meta tags exist', function() {
      const html = '<head><link rel="stylesheet"></head>';
      const result = updateMetaTag(html, 'description', 'Test description');
      
      const metaIndex = result.indexOf('<meta name="description"');
      const linkIndex = result.indexOf('<link rel="stylesheet"');
      assert(metaIndex < linkIndex, 'Should prepend when no title or meta');
    });

    it('should handle HTML characters in meta tag attributes', function() {
      const html = '<head></head>';
      const result = updateMetaTag(html, 'test<script>', 'content with "quotes" & <tags>');
      
      // Check that content is properly escaped in the HTML output
      assert(result.includes('&quot;quotes&quot;'), 'Should escape quotes in content');
      assert(result.includes('&amp;'), 'Should escape ampersands in content'); 
      assert(result.includes('name="test<script>"'), 'Should include name attribute');
    });
  });

  describe('updateLinkTag branches', function() {
    it('should create head when none exists', function() {
      const html = '<body>Content</body>';
      const result = updateLinkTag(html, 'canonical', 'https://example.com');
      
      assert(result.includes('<head>'), 'Should create head element');
      assert(result.includes('<link rel="canonical" href="https://example.com">'), 'Should add link tag');
    });

    it('should replace existing link tag with same rel', function() {
      const html = '<head><link rel="canonical" href="https://old.com"></head>';
      const result = updateLinkTag(html, 'canonical', 'https://new.com');
      
      assert(result.includes('href="https://new.com"'), 'Should update href');
      assert(!result.includes('https://old.com'), 'Should not contain old href');
    });

    it('should handle additional attributes', function() {
      const html = '<head></head>';
      const result = updateLinkTag(html, 'icon', '/favicon.ico', {
        type: 'image/x-icon',
        sizes: '16x16'
      });
      
      assert(result.includes('type="image/x-icon"'), 'Should include type attribute');
      assert(result.includes('sizes="16x16"'), 'Should include sizes attribute');
    });

    it('should handle empty additional attributes', function() {
      const html = '<head></head>';
      const result = updateLinkTag(html, 'canonical', 'https://example.com', {});
      
      assert(result.includes('<link rel="canonical" href="https://example.com">'), 'Should work with empty attributes');
    });

    it('should insert after existing link tags', function() {
      const html = '<head><link rel="stylesheet" href="/style.css"></head>';
      const result = updateLinkTag(html, 'canonical', 'https://example.com');
      
      const stylesheetIndex = result.indexOf('<link rel="stylesheet"');
      const canonicalIndex = result.indexOf('<link rel="canonical"');
      assert(canonicalIndex > stylesheetIndex, 'Should insert after existing links');
    });

    it('should insert after meta tags when no links exist', function() {
      const html = '<head><meta name="description" content="test"></head>';
      const result = updateLinkTag(html, 'canonical', 'https://example.com');
      
      const metaIndex = result.indexOf('<meta name="description"');
      const linkIndex = result.indexOf('<link rel="canonical"');
      assert(linkIndex > metaIndex, 'Should insert after meta tags');
    });

    it('should append when no meta or link tags exist', function() {
      const html = '<head><title>Test</title></head>';
      const result = updateLinkTag(html, 'canonical', 'https://example.com');
      
      assert(result.includes('</title><link rel="canonical"') || 
             result.includes('</head>') && result.indexOf('<link') < result.indexOf('</head>'), 
             'Should append to head');
    });

    it('should handle HTML characters in link attributes', function() {
      const html = '<head></head>';
      const result = updateLinkTag(html, 'test<script>', 'https://example.com?param="value"&other=<test>', {
        custom: 'value with "quotes" & <tags>'
      });
      
      // Check the actual escaping behavior from the implementation
      assert(result.includes('&quot;value&quot;'), 'Should escape quotes in href');
      assert(result.includes('&amp;other='), 'Should escape ampersands in href');
      assert(result.includes('&quot;quotes&quot;'), 'Should escape quotes in custom attributes');
      assert(result.includes('rel="test<script>"'), 'Should include rel attribute');
    });
  });

  describe('addScript branches', function() {
    it('should create head when none exists', function() {
      const html = '<body>Content</body>';
      const result = addScript(html, '{"@type": "WebPage"}');
      
      assert(result.includes('<head>'), 'Should create head element');
      assert(result.includes('<script type="application/ld+json">'), 'Should add script tag');
    });

    it('should handle custom script type', function() {
      const html = '<head></head>';
      const result = addScript(html, 'console.log("test");', 'text/javascript');
      
      assert(result.includes('<script type="text/javascript">'), 'Should use custom type');
      assert(result.includes('console.log("test");'), 'Should include script content');
    });

    it('should handle start position', function() {
      const html = '<head><meta name="test" content="value"></head>';
      const result = addScript(html, '{"test": true}', 'application/ld+json', 'start');
      
      const scriptIndex = result.indexOf('<script');
      const metaIndex = result.indexOf('<meta');
      assert(scriptIndex < metaIndex, 'Should prepend script at start');
    });

    it('should handle end position (default)', function() {
      const html = '<head><meta name="test" content="value"></head>';
      const result = addScript(html, '{"test": true}');
      
      const scriptIndex = result.indexOf('<script');
      const metaIndex = result.indexOf('<meta');
      assert(scriptIndex > metaIndex, 'Should append script at end');
    });

    it('should escape script type but not content', function() {
      const html = '<head></head>';
      const result = addScript(html, '{"test": "<script>"}', 'application/ld+json"onload="alert(1)');
      
      assert(result.includes('type="application/ld+json&quot;onload=&quot;alert(1)"'), 'Should escape type attribute');
      assert(result.includes('{"test": "<script>"}'), 'Should not escape script content');
    });
  });

  describe('removeExistingMetaTags branches', function() {
    it('should remove default SEO meta tags when no custom tags specified', function() {
      const html = `
        <head>
          <meta name="description" content="old">
          <meta name="keywords" content="old">
          <meta name="robots" content="old">
          <meta property="og:title" content="old">
          <meta name="twitter:card" content="old">
          <link rel="canonical" href="old">
          <script type="application/ld+json">{"old": true}</script>
        </head>
      `;
      
      const result = removeExistingMetaTags(html);
      
      assert(!result.includes('meta name="description"'), 'Should remove description');
      assert(!result.includes('meta name="keywords"'), 'Should remove keywords');
      assert(!result.includes('meta name="robots"'), 'Should remove robots');
      assert(!result.includes('property="og:title"'), 'Should remove OpenGraph tags');
      assert(!result.includes('meta name="twitter:card"'), 'Should remove Twitter tags');
      assert(!result.includes('link rel="canonical"'), 'Should remove canonical link');
      assert(!result.includes('application/ld+json'), 'Should remove JSON-LD scripts');
    });

    it('should remove only specified tags when custom tags provided', function() {
      const html = `
        <head>
          <meta name="description" content="keep">
          <meta name="custom" content="remove">
          <meta name="robots" content="keep">
        </head>
      `;
      
      const result = removeExistingMetaTags(html, ['custom']);
      
      assert(result.includes('meta name="description"'), 'Should keep description');
      assert(result.includes('meta name="robots"'), 'Should keep robots');
      assert(!result.includes('meta name="custom"'), 'Should remove custom tag');
    });

    it('should handle tags with both name and property attributes', function() {
      const html = `
        <head>
          <meta name="description" content="test">
          <meta property="description" content="test">
        </head>
      `;
      
      const result = removeExistingMetaTags(html, ['description']);
      
      assert(!result.includes('meta name="description"'), 'Should remove name attribute version');
      assert(!result.includes('meta property="description"'), 'Should remove property attribute version');
    });

    it('should handle empty tags array by using defaults', function() {
      const html = `
        <head>
          <meta name="description" content="old">
          <meta property="og:title" content="old">
        </head>
      `;
      
      const result = removeExistingMetaTags(html, []);
      
      assert(!result.includes('meta name="description"'), 'Should remove default tags with empty array');
      assert(!result.includes('property="og:title"'), 'Should remove default OpenGraph tags');
    });
  });

  describe('Additional branch coverage tests', function() {
    it('should handle updateMetaTag with different insertion scenarios', function() {
      // Test the complex insertion logic branches
      const htmlNoTitle = '<head><link rel="stylesheet" href="/style.css"></head>';
      const result1 = updateMetaTag(htmlNoTitle, 'description', 'test');
      
      // Should prepend when no title or meta tags exist
      const descIndex = result1.indexOf('<meta name="description"');
      const linkIndex = result1.indexOf('<link rel="stylesheet"');
      assert(descIndex < linkIndex, 'Should prepend meta before other elements when no title/meta');
    });

    it('should handle updateLinkTag with various insertion positions', function() {
      // Test link insertion after different elements
      const htmlMetaOnly = '<head><meta name="description" content="test"></head>';
      const result = updateLinkTag(htmlMetaOnly, 'canonical', 'https://example.com');
      
      const metaIndex = result.indexOf('<meta name="description"');
      const linkIndex = result.indexOf('<link rel="canonical"');
      assert(linkIndex > metaIndex, 'Should insert link after meta tags');
    });

    it('should handle escapeHtml with null and undefined values', function() {
      // Test the non-string conversion branch
      const html = '<head></head>';
      
      const nullResult = updateMetaTag(html, 'test', null);
      assert(nullResult.includes('content="null"'), 'Should convert null to string "null"');
      
      const undefinedResult = updateMetaTag('<head></head>', 'test', undefined);
      assert(undefinedResult.includes('content="undefined"'), 'Should convert undefined to string "undefined"');
    });

    it('should handle removeExistingMetaTags with specific tag list', function() {
      // Test the tagsToRemove.length > 0 branch
      const html = '<head><meta name="keep" content="value"><meta name="remove" content="value"></head>';
      const result = removeExistingMetaTags(html, ['remove']);
      
      assert(result.includes('meta name="keep"'), 'Should keep non-specified tags');
      assert(!result.includes('meta name="remove"'), 'Should remove specified tags');
    });

    it('should handle addScript with position start vs end', function() {
      // Test both position branches in addScript
      const html = '<head><title>Test</title></head>';
      
      const startResult = addScript(html, '{"start": true}', 'application/ld+json', 'start');
      const scriptIndex = startResult.indexOf('<script');
      const titleIndex = startResult.indexOf('<title>');
      assert(scriptIndex < titleIndex, 'Start position should place script before title');
      
      const endResult = addScript(html, '{"end": true}', 'application/ld+json', 'end');
      const endScriptIndex = endResult.indexOf('<script');
      const endTitleIndex = endResult.indexOf('</title>');
      assert(endScriptIndex > endTitleIndex, 'End position should place script after title');
    });

    it('should handle updateLinkTag with attributes object edge cases', function() {
      // Test empty vs populated attributes
      const html = '<head></head>';
      
      const emptyAttrsResult = updateLinkTag(html, 'canonical', 'https://example.com', {});
      assert(emptyAttrsResult.includes('<link rel="canonical" href="https://example.com">'), 'Should handle empty attributes object');
      
      const withAttrsResult = updateLinkTag('<head></head>', 'stylesheet', '/style.css', {
        media: 'screen',
        crossorigin: 'anonymous'
      });
      assert(withAttrsResult.includes('media="screen"'), 'Should include media attribute');
      assert(withAttrsResult.includes('crossorigin="anonymous"'), 'Should include crossorigin attribute');
    });

    it('should handle HTML structures without html element in injectIntoHead', function() {
      // Test the $("html").length === 0 branch
      const htmlFragment = '<body><p>Content only</p></body>';
      const result = injectIntoHead(htmlFragment, '<meta name="test" content="value">', {
        createHead: true
      });
      
      // Cheerio will add HTML structure
      assert(result.includes('<head>'), 'Should create head element');
      assert(result.includes('<meta name="test" content="value">'), 'Should inject content');
      assert(result.includes('<p>Content only</p>'), 'Should preserve original content');
    });

    it('should handle ensureTitle false with various positions', function() {
      // Test ensureTitle=false with different positions to avoid title creation
      const html = '<head><meta name="existing" content="test"></head>';
      const content = '<meta name="new" content="value">';
      
      const beforeTitleResult = injectIntoHead(html, content, { 
        position: 'before-title',
        ensureTitle: false 
      });
      
      // Should not create title when ensureTitle is false
      assert(!beforeTitleResult.includes('<title>'), 'Should not create title when ensureTitle=false');
      assert(beforeTitleResult.includes('<meta name="new" content="value">'), 'Should still inject content');
    });
  });
});