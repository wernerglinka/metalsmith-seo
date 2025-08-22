/**
 * Completely isolated test for siteOwner fallback functionality
 * This test runs independently to avoid any pollution from other tests
 */

import assert from "assert";
import Metalsmith from "metalsmith";
import seo from "../src/index.js";

describe("SiteOwner Fallback (Isolated)", () => {
  // Each test uses unique URLs and configurations to avoid cache conflicts

  it("should use siteOwner when no author exists in frontmatter", (done) => {
    // Create completely fresh Metalsmith instance with no shared state
    const metalsmith = Metalsmith("test/fixtures/html");
    
    // Set site metadata with siteOwner
    metalsmith.metadata({
      site: {
        url: "https://isolated-test.com",
        title: "Isolated Test Site",
        siteOwner: "Isolated Test Author"
      }
    });

    // Create test file with NO author information anywhere
    const testFiles = {
      "isolated-test.html": {
        title: "Test Page With No Author",
        date: "2025-01-15",
        description: "A test page without any author information",
        contents: Buffer.from("<html><head></head><body><h1>Isolated Test</h1></body></html>")
      }
    };

    // Override the files method to return our test files
    metalsmith.files = () => testFiles;

    // Create plugin instance with fresh configuration
    const plugin = seo({
      hostname: "https://isolated-test.com"
    });

    // Execute the plugin
    plugin(testFiles, metalsmith, (err) => {
      if (err) {
        console.error("Plugin error:", err);
        return done(err);
      }

      try {
        const processedFile = testFiles["isolated-test.html"];
        const html = processedFile.contents.toString();
        const seoMetadata = processedFile.seoMetadata;

        // Debug output for this isolated test
        console.log("\n=== ISOLATED SITEOWNER TEST DEBUG ===");
        console.log("Site metadata:", metalsmith.metadata().site);
        console.log("SEO metadata author:", seoMetadata?.author);
        console.log("HTML contains 'Isolated Test Author':", html.includes('Isolated Test Author'));
        
        // Primary assertion: Check seoMetadata directly
        assert(seoMetadata, "seoMetadata should be generated");
        assert.strictEqual(
          seoMetadata.author, 
          "Isolated Test Author",
          "Author should be extracted from siteOwner"
        );

        // Secondary assertion: Check HTML output
        assert(
          html.includes('Isolated Test Author'),
          "HTML should contain the siteOwner name"
        );

        // Tertiary assertion: Check specific meta tag
        assert(
          html.includes('<meta name="author" content="Isolated Test Author">'),
          "HTML should have correct author meta tag"
        );

        // Quaternary assertion: Check JSON-LD structure
        assert(
          html.includes('"name": "Isolated Test Author"'),
          "JSON-LD should include author name"
        );

        console.log("✅ All isolated siteOwner fallback tests passed!");
        done();

      } catch (assertionError) {
        console.error("Assertion failed:", assertionError.message);
        done(assertionError);
      }
    });
  });

  it("should work with minimal configuration", (done) => {
    // Use completely different domain/config to avoid cache
    const metalsmith = Metalsmith("test/fixtures/html");
    
    metalsmith.metadata({
      site: {
        url: "https://minimal-test-unique.com", // Different URL
        title: "Minimal Site",
        siteOwner: "Minimal Test Author"
      }
    });

    const testFiles = {
      "minimal-unique.html": { // Different filename
        title: "Minimal Test",
        contents: Buffer.from("<html><head></head><body>Minimal</body></html>")
      }
    };

    metalsmith.files = () => testFiles;

    const plugin = seo({
      hostname: "https://minimal-test-unique.com" // Match the site URL
    });

    plugin(testFiles, metalsmith, (err) => {
      if (err) return done(err);

      const seoMetadata = testFiles["minimal-unique.html"].seoMetadata;
      
      assert.strictEqual(
        seoMetadata.author,
        "Minimal Test Author",
        "Should extract siteOwner even with minimal config"
      );

      done();
    });
  });

  it("should handle missing siteOwner gracefully", (done) => {
    // Test what happens when no siteOwner is provided - use unique config
    const metalsmith = Metalsmith("test/fixtures/html");
    
    metalsmith.metadata({
      site: {
        url: "https://no-owner-unique-test.com", // Unique URL
        title: "No Owner Site Unique"
        // No siteOwner property
      }
    });

    const testFiles = {
      "no-owner-unique.html": { // Unique filename
        title: "No Owner Test",
        contents: Buffer.from("<html><head></head><body>No Owner</body></html>")
      }
    };

    metalsmith.files = () => testFiles;

    const plugin = seo({
      hostname: "https://no-owner-unique-test.com" // Match the site URL
    });

    plugin(testFiles, metalsmith, (err) => {
      if (err) return done(err);

      const seoMetadata = testFiles["no-owner-unique.html"].seoMetadata;
      const html = testFiles["no-owner-unique.html"].contents.toString();
      
      // Should be undefined when no siteOwner and no author
      assert.strictEqual(
        seoMetadata.author,
        undefined,
        "Author should be undefined when no siteOwner provided"
      );

      // Should not have author meta tag
      assert(
        !html.includes('<meta name="author"'),
        "Should not generate author meta tag when no author available"
      );

      done();
    });
  });
});