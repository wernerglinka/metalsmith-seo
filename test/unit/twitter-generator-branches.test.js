import { describe, it, beforeEach } from 'mocha';
import assert from 'assert';
import { 
  generateTwitterCardTags, 
  twitterCardTagsToHtml 
} from '../../src/generators/twitter-generator.js';

describe('Twitter Generator Branch Coverage Tests', function() {
  this.timeout(5000);
  
  beforeEach(function() {
    process.env.NODE_ENV = 'test';
  });

  describe('generateTwitterCardTags branches', function() {
    it('should handle all card type determination branches', function() {
      // Test explicit metadata twitter card override
      const explicitResult = generateTwitterCardTags({ 
        twitterCard: 'summary_large_image',
        title: 'Test'
      }, {});
      const explicitCardTag = explicitResult.metaTags.find(tag => tag.name === 'twitter:card');
      assert(explicitCardTag.content === 'summary_large_image', 'Should use explicit metadata twitterCard');
      
      // Test site config twitter card type
      const siteConfigResult = generateTwitterCardTags({ title: 'Test' }, { 
        twitterCardType: 'player' 
      });
      const siteConfigCardTag = siteConfigResult.metaTags.find(tag => tag.name === 'twitter:card');
      assert(siteConfigCardTag.content === 'player', 'Should use site config twitterCardType');
      
      // Test image auto-detection
      const imageResult = generateTwitterCardTags({ 
        title: 'Test',
        image: '/test.jpg'
      }, {});
      const imageCardTag = imageResult.metaTags.find(tag => tag.name === 'twitter:card');
      assert(imageCardTag.content === 'summary_large_image', 'Should auto-detect summary_large_image from image');
      
      // Test video type auto-detection
      const videoTypeResult = generateTwitterCardTags({ 
        title: 'Test',
        type: 'video'
      }, {});
      const videoTypeCardTag = videoTypeResult.metaTags.find(tag => tag.name === 'twitter:card');
      assert(videoTypeCardTag.content === 'player', 'Should auto-detect player from video type');
      
      // Test video URL auto-detection
      const videoUrlResult = generateTwitterCardTags({ 
        title: 'Test',
        videoUrl: 'https://example.com/video.mp4'
      }, {});
      const videoUrlCardTag = videoUrlResult.metaTags.find(tag => tag.name === 'twitter:card');
      assert(videoUrlCardTag.content === 'player', 'Should auto-detect player from videoUrl');
      
      // Test app type auto-detection
      const appTypeResult = generateTwitterCardTags({ 
        title: 'Test',
        type: 'app'
      }, {});
      const appTypeCardTag = appTypeResult.metaTags.find(tag => tag.name === 'twitter:card');
      assert(appTypeCardTag.content === 'app', 'Should auto-detect app from app type');
      
      // Test app ID auto-detection
      const appIdResult = generateTwitterCardTags({ 
        title: 'Test',
        appId: '123456'
      }, {});
      const appIdCardTag = appIdResult.metaTags.find(tag => tag.name === 'twitter:card');
      assert(appIdCardTag.content === 'app', 'Should auto-detect app from appId');
      
      // Test default summary
      const defaultResult = generateTwitterCardTags({ title: 'Test' }, {});
      const defaultCardTag = defaultResult.metaTags.find(tag => tag.name === 'twitter:card');
      assert(defaultCardTag.content === 'summary', 'Should default to summary');
    });

    it('should handle core Twitter tags with all optional fields', function() {
      const metadata = {
        title: 'Very Long Title That Should Be Truncated Because Twitter Has Limits on Title Length',
        description: 'Very long description that should be truncated because Twitter has specific limits on description length that we need to respect. This description is intentionally long to test the truncation functionality properly.',
        twitterCreator: 'creator_handle'
      };
      const siteConfig = {
        twitterSite: 'site_handle'
      };
      
      const result = generateTwitterCardTags(metadata, siteConfig);
      
      const titleTag = result.metaTags.find(tag => tag.name === 'twitter:title');
      const descriptionTag = result.metaTags.find(tag => tag.name === 'twitter:description');
      const siteTag = result.metaTags.find(tag => tag.name === 'twitter:site');
      const creatorTag = result.metaTags.find(tag => tag.name === 'twitter:creator');
      
      assert(titleTag && titleTag.content.length <= 73, 'Should truncate long titles'); // 70 + "..."
      assert(titleTag.content.includes('...'), 'Should add ellipsis to truncated title');
      assert(descriptionTag && descriptionTag.content.length <= 203, 'Should truncate long descriptions'); // 200 + "..."
      assert(siteTag && siteTag.content === '@site_handle', 'Should add @ to site handle');
      assert(creatorTag && creatorTag.content === '@creator_handle', 'Should add @ to creator handle');
    });

    it('should handle core Twitter tags with missing optional fields', function() {
      const metadata = {
        title: 'Test Title'
        // Missing description, twitterCreator
      };
      const siteConfig = {
        // Missing twitterSite
      };
      
      const result = generateTwitterCardTags(metadata, siteConfig);
      
      const descriptionTag = result.metaTags.find(tag => tag.name === 'twitter:description');
      const siteTag = result.metaTags.find(tag => tag.name === 'twitter:site');
      const creatorTag = result.metaTags.find(tag => tag.name === 'twitter:creator');
      
      assert(!descriptionTag, 'Should not have description tag when missing');
      assert(!siteTag, 'Should not have site tag when missing');
      assert(!creatorTag, 'Should not have creator tag when missing');
    });

    it('should handle creator fallback hierarchy', function() {
      // Test twitterCreator override
      const twitterCreatorResult = generateTwitterCardTags({
        title: 'Test',
        twitterCreator: 'twitter_creator',
        author: 'author_name'
      }, { twitterCreator: 'site_creator' });
      
      const twitterCreatorTag = twitterCreatorResult.metaTags.find(tag => tag.name === 'twitter:creator');
      assert(twitterCreatorTag.content === '@twitter_creator', 'Should use twitterCreator first');
      
      // Test author fallback
      const authorResult = generateTwitterCardTags({
        title: 'Test',
        author: 'author_name'
      }, { twitterCreator: 'site_creator' });
      
      const authorTag = authorResult.metaTags.find(tag => tag.name === 'twitter:creator');
      assert(authorTag.content === '@author_name', 'Should fall back to author');
      
      // Test site config fallback
      const siteCreatorResult = generateTwitterCardTags({
        title: 'Test'
      }, { twitterCreator: 'site_creator' });
      
      const siteCreatorTag = siteCreatorResult.metaTags.find(tag => tag.name === 'twitter:creator');
      assert(siteCreatorTag.content === '@site_creator', 'Should fall back to site twitterCreator');
    });

    it('should handle Twitter handle formatting edge cases', function() {
      const testCases = [
        { input: '@already_has_at', expected: '@already_has_at' },
        { input: 'no_at_symbol', expected: '@no_at_symbol' },
        { input: '  spaced_handle  ', expected: '@spaced_handle' },
        { input: 123, expected: '123' }, // Non-string input
        { input: true, expected: 'true' }, // Boolean input
        { input: ' ', expected: '@' } // Space string (empty after trim)
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = generateTwitterCardTags({
          title: 'Test',
          twitterCreator: input
        }, {});
        
        const creatorTag = result.metaTags.find(tag => tag.name === 'twitter:creator');
        assert(creatorTag && creatorTag.content === expected, 
               `Handle "${input}" should format to "${expected}", got "${creatorTag?.content}"`);
      });
      
      // Test empty string separately (should not create tag because it's falsy)
      const emptyResult = generateTwitterCardTags({
        title: 'Test',
        twitterCreator: ''
      }, {});
      const emptyCreatorTag = emptyResult.metaTags.find(tag => tag.name === 'twitter:creator');
      assert(!emptyCreatorTag, 'Empty string should not create creator tag');
    });

    it('should handle title truncation edge cases', function() {
      // Test title exactly at limit
      const exactLimitTitle = 'A'.repeat(70);
      const exactResult = generateTwitterCardTags({ title: exactLimitTitle }, {});
      const exactTitleTag = exactResult.metaTags.find(tag => tag.name === 'twitter:title');
      assert(exactTitleTag.content === exactLimitTitle, 'Should not truncate title at exact limit');
      
      // Test title with space for good truncation
      const goodSpaceTitle = 'This is a good title with spaces that can be truncated nicely at word boundary';
      const goodSpaceResult = generateTwitterCardTags({ title: goodSpaceTitle }, {});
      const goodSpaceTitleTag = goodSpaceResult.metaTags.find(tag => tag.name === 'twitter:title');
      assert(goodSpaceTitleTag.content.endsWith('...'), 'Should truncate at word boundary with ellipsis');
      assert(!goodSpaceTitleTag.content.includes(' ...'), 'Should not have space before ellipsis');
      
      // Test title with no good space break
      const noSpaceTitle = 'A'.repeat(80);
      const noSpaceResult = generateTwitterCardTags({ title: noSpaceTitle }, {});
      const noSpaceTitleTag = noSpaceResult.metaTags.find(tag => tag.name === 'twitter:title');
      assert(noSpaceTitleTag.content.endsWith('...'), 'Should hard truncate with ellipsis when no good space');
      assert(noSpaceTitleTag.content.length === 73, 'Should be exactly 70 chars + "..."');
    });

    it('should handle description truncation edge cases', function() {
      // Test description exactly at limit
      const exactLimitDesc = 'A'.repeat(200);
      const exactResult = generateTwitterCardTags({ title: 'Test', description: exactLimitDesc }, {});
      const exactDescTag = exactResult.metaTags.find(tag => tag.name === 'twitter:description');
      assert(exactDescTag.content === exactLimitDesc, 'Should not truncate description at exact limit');
      
      // Test description with sentence boundary (make it longer than 200 chars)
      const sentenceDesc = 'This is the first sentence that needs to be long enough to trigger truncation behavior when combined with other sentences. This is the second sentence that definitely makes it too long and should be removed during the truncation process for Twitter cards and social media optimization.';
      const sentenceResult = generateTwitterCardTags({ title: 'Test', description: sentenceDesc }, {});
      const sentenceDescTag = sentenceResult.metaTags.find(tag => tag.name === 'twitter:description');
      assert(sentenceDescTag.content.endsWith('.'), 'Should truncate at sentence boundary');
      assert(!sentenceDescTag.content.includes('second sentence'), 'Should truncate before sentence that makes it too long');
      
      // Test description with good word boundary
      const wordDesc = `${'A'.repeat(180)} some more words that will be truncated`;
      const wordResult = generateTwitterCardTags({ title: 'Test', description: wordDesc }, {});
      const wordDescTag = wordResult.metaTags.find(tag => tag.name === 'twitter:description');
      assert(wordDescTag.content.endsWith('...'), 'Should truncate at word boundary with ellipsis');
      
      // Test description with no good break
      const noBreakDesc = 'A'.repeat(250);
      const noBreakResult = generateTwitterCardTags({ title: 'Test', description: noBreakDesc }, {});
      const noBreakDescTag = noBreakResult.metaTags.find(tag => tag.name === 'twitter:description');
      assert(noBreakDescTag.content.endsWith('...'), 'Should hard truncate with ellipsis');
      assert(noBreakDescTag.content.length === 203, 'Should be exactly 200 chars + "..."');
    });

    it('should handle summary_large_image card type branches', function() {
      // Test with image
      const withImageResult = generateTwitterCardTags({
        twitterCard: 'summary_large_image',
        title: 'Test',
        image: '/test.jpg',
        imageAlt: 'Custom alt text'
      }, {});
      
      const imageTag = withImageResult.metaTags.find(tag => tag.name === 'twitter:image');
      const imageAltTag = withImageResult.metaTags.find(tag => tag.name === 'twitter:image:alt');
      
      assert(imageTag && imageTag.content === '/test.jpg', 'Should have image tag');
      assert(imageAltTag && imageAltTag.content === 'Custom alt text', 'Should have custom alt text');
      
      // Test without image
      const withoutImageResult = generateTwitterCardTags({
        twitterCard: 'summary_large_image',
        title: 'Test'
      }, {});
      
      const noImageTag = withoutImageResult.metaTags.find(tag => tag.name === 'twitter:image');
      assert(!noImageTag, 'Should not have image tag when no image');
      
      // Test with image but no alt text
      const noAltResult = generateTwitterCardTags({
        twitterCard: 'summary_large_image',
        title: 'Test Title',
        image: '/test.jpg'
      }, {});
      
      const noAltImageAltTag = noAltResult.metaTags.find(tag => tag.name === 'twitter:image:alt');
      assert(noAltImageAltTag.content === 'Test Title', 'Should use title as alt fallback');
    });

    it('should handle summary card type branches', function() {
      // Test with image
      const withImageResult = generateTwitterCardTags({
        twitterCard: 'summary',
        title: 'Test',
        image: '/test.jpg',
        imageAlt: 'Custom alt text'
      }, {});
      
      const imageTag = withImageResult.metaTags.find(tag => tag.name === 'twitter:image');
      const imageAltTag = withImageResult.metaTags.find(tag => tag.name === 'twitter:image:alt');
      
      assert(imageTag && imageTag.content === '/test.jpg', 'Should have image tag');
      assert(imageAltTag && imageAltTag.content === 'Custom alt text', 'Should have custom alt text');
      
      // Test without image
      const withoutImageResult = generateTwitterCardTags({
        twitterCard: 'summary',
        title: 'Test'
      }, {});
      
      const noImageTag = withoutImageResult.metaTags.find(tag => tag.name === 'twitter:image');
      assert(!noImageTag, 'Should not have image tag when no image');
    });

    it('should handle app card type branches', function() {
      // Test with all app metadata
      const fullAppResult = generateTwitterCardTags({
        twitterCard: 'app',
        title: 'App',
        iosAppId: 'ios123',
        iosAppUrl: 'myapp://ios',
        androidAppId: 'android123',
        androidAppUrl: 'myapp://android',
        appName: 'My App'
      }, {});
      
      assert(fullAppResult.metaTags.find(tag => tag.name === 'twitter:app:id:iphone'), 'Should have iOS app ID');
      assert(fullAppResult.metaTags.find(tag => tag.name === 'twitter:app:url:iphone'), 'Should have iOS app URL');
      assert(fullAppResult.metaTags.find(tag => tag.name === 'twitter:app:id:googleplay'), 'Should have Android app ID');
      assert(fullAppResult.metaTags.find(tag => tag.name === 'twitter:app:url:googleplay'), 'Should have Android app URL');
      assert(fullAppResult.metaTags.filter(tag => tag.name === 'twitter:app:name:iphone').length === 1, 'Should have iOS app name');
      assert(fullAppResult.metaTags.filter(tag => tag.name === 'twitter:app:name:googleplay').length === 1, 'Should have Android app name');
      
      // Test with site config fallback
      const siteConfigAppResult = generateTwitterCardTags({
        twitterCard: 'app',
        title: 'App'
      }, {
        iosAppId: 'site_ios123',
        iosAppUrl: 'site://ios',
        androidAppId: 'site_android123',
        androidAppUrl: 'site://android',
        appName: 'Site App'
      });
      
      const siteIosIdTag = siteConfigAppResult.metaTags.find(tag => tag.name === 'twitter:app:id:iphone');
      assert(siteIosIdTag.content === 'site_ios123', 'Should use site config iOS app ID');
      
      // Test with missing app data
      const minimalAppResult = generateTwitterCardTags({
        twitterCard: 'app',
        title: 'App'
      }, {});
      
      assert(!minimalAppResult.metaTags.find(tag => tag.name === 'twitter:app:id:iphone'), 'Should not have iOS tags when missing');
      assert(!minimalAppResult.metaTags.find(tag => tag.name === 'twitter:app:id:googleplay'), 'Should not have Android tags when missing');
      assert(!minimalAppResult.metaTags.find(tag => tag.name === 'twitter:app:name:iphone'), 'Should not have app name tags when missing');
    });

    it('should handle player card type branches', function() {
      // Test with all video metadata
      const fullVideoResult = generateTwitterCardTags({
        twitterCard: 'player',
        title: 'Video',
        videoUrl: 'https://example.com/video.mp4',
        videoWidth: 640,
        videoHeight: 480,
        videoStreamUrl: 'https://example.com/stream.m3u8',
        image: '/thumbnail.jpg'
      }, {});
      
      const playerTag = fullVideoResult.metaTags.find(tag => tag.name === 'twitter:player');
      const widthTag = fullVideoResult.metaTags.find(tag => tag.name === 'twitter:player:width');
      const heightTag = fullVideoResult.metaTags.find(tag => tag.name === 'twitter:player:height');
      const streamTag = fullVideoResult.metaTags.find(tag => tag.name === 'twitter:player:stream');
      const imageTag = fullVideoResult.metaTags.find(tag => tag.name === 'twitter:image');
      
      assert(playerTag && playerTag.content === 'https://example.com/video.mp4', 'Should have player URL');
      assert(widthTag && widthTag.content === '640', 'Should have player width');
      assert(heightTag && heightTag.content === '480', 'Should have player height');
      assert(streamTag && streamTag.content === 'https://example.com/stream.m3u8', 'Should have stream URL');
      assert(imageTag && imageTag.content === '/thumbnail.jpg', 'Should have thumbnail image');
      
      // Test with missing video metadata
      const minimalVideoResult = generateTwitterCardTags({
        twitterCard: 'player',
        title: 'Video'
      }, {});
      
      assert(!minimalVideoResult.metaTags.find(tag => tag.name === 'twitter:player'), 'Should not have player when no URL');
      assert(!minimalVideoResult.metaTags.find(tag => tag.name === 'twitter:player:width'), 'Should not have width when missing');
      assert(!minimalVideoResult.metaTags.find(tag => tag.name === 'twitter:player:height'), 'Should not have height when missing');
      assert(!minimalVideoResult.metaTags.find(tag => tag.name === 'twitter:player:stream'), 'Should not have stream when missing');
      assert(!minimalVideoResult.metaTags.find(tag => tag.name === 'twitter:image'), 'Should not have image when missing');
    });

    it('should handle default case for unknown card types', function() {
      // Force unknown card type by setting it explicitly
      const unknownResult = generateTwitterCardTags({
        twitterCard: 'unknown_type',
        title: 'Test',
        image: '/test.jpg',
        imageAlt: 'Test alt'
      }, {});
      
      // Should default to summary behavior
      const imageTag = unknownResult.metaTags.find(tag => tag.name === 'twitter:image');
      const altTag = unknownResult.metaTags.find(tag => tag.name === 'twitter:image:alt');
      
      assert(imageTag && imageTag.content === '/test.jpg', 'Should add image tag like summary');
      assert(altTag && altTag.content === 'Test alt', 'Should add alt tag like summary');
    });
  });

  describe('twitterCardTagsToHtml branches', function() {
    it('should handle HTML escaping in Twitter tags', function() {
      const metaTags = [
        { 
          name: 'twitter:title<script>', 
          content: 'Title with "quotes" & <tags>' 
        },
        {
          name: 'twitter:description',
          content: 'Description with \'single quotes\' and &amp; entities'
        }
      ];
      
      const html = twitterCardTagsToHtml(metaTags);
      
      assert(html.includes('name="twitter:title&lt;script&gt;"'), 'Should escape name attribute');
      assert(html.includes('content="Title with &quot;quotes&quot; &amp; &lt;tags&gt;"'), 'Should escape content attribute');
      assert(html.includes('content="Description with &#39;single quotes&#39; and &amp;amp; entities"'), 'Should escape single quotes and existing entities');
    });

    it('should handle non-string values in tags', function() {
      const metaTags = [
        { name: 'twitter:player:width', content: 640 },
        { name: 'twitter:available', content: true },
        { name: 'twitter:count', content: 0 }
      ];
      
      const html = twitterCardTagsToHtml(metaTags);
      
      assert(html.includes('content="640"'), 'Should convert number to string');
      assert(html.includes('content="true"'), 'Should convert boolean to string');
      assert(html.includes('content="0"'), 'Should convert zero to string');
    });

    it('should handle empty meta tags array', function() {
      const html = twitterCardTagsToHtml([]);
      assert(html === '', 'Should return empty string for empty array');
    });

    it('should join multiple tags with newlines', function() {
      const metaTags = [
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: 'Title' }
      ];
      
      const html = twitterCardTagsToHtml(metaTags);
      const lines = html.split('\n');
      
      assert(lines.length === 2, 'Should have 2 lines');
      assert(lines[0].includes('twitter:card'), 'First line should have card');
      assert(lines[1].includes('twitter:title'), 'Second line should have title');
    });
  });
});