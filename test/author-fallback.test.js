/**
 * Test that the plugin correctly falls back to siteOwner when no author is specified
 */

import assert from "assert";
import Metalsmith from "metalsmith";
import seo from "../src/index.js";

describe("Author fallback integration", () => {
  it("should use siteOwner from site metadata when no author is specified", (done) => {
    const metalsmith = Metalsmith("test/fixtures/html")
      .metadata({
        site: {
          url: "https://example.com",
          title: "Test Site",
          siteOwner: "Werner Glinka"
        }
      })
      .use(seo({
        hostname: "https://example.com"
      }));

    // Create a test file without any author
    const files = {
      "test-page.html": {
        title: "Page Without Author",
        date: "2025-01-01",
        contents: Buffer.from("<html><head></head><body><h1>Test</h1></body></html>")
      }
    };

    metalsmith.files = () => files;
    
    const plugin = seo({
      hostname: "https://example.com"
    });
    plugin(files, metalsmith, (err) => {
      if (err) {return done(err);}

      const html = files["test-page.html"].contents.toString();
      const seoMetadata = files["test-page.html"].seoMetadata;
      
      // Test the metadata extraction directly (most reliable)
      assert.strictEqual(seoMetadata.author, "Werner Glinka", 
        "seoMetadata should contain siteOwner as author");
      
      // Test HTML generation as secondary check
      assert(html.includes('Werner Glinka'), 
        "Should include siteOwner in generated HTML");
      
      done();
    });
  });

  it("should prioritize frontmatter author over siteOwner", (done) => {
    const metalsmith = Metalsmith("test/fixtures/html")
      .metadata({
        site: {
          url: "https://example.com",
          title: "Test Site",
          siteOwner: "Werner Glinka"
        }
      });

    const files = {
      "test-page.html": {
        title: "Page With Specific Author",
        author: "Jane Doe",
        date: "2025-01-01",
        contents: Buffer.from("<html><head></head><body><h1>Test</h1></body></html>")
      }
    };

    metalsmith.files = () => files;
    
    const plugin = seo({
      hostname: "https://example.com"
    });
    plugin(files, metalsmith, (err) => {
      if (err) {return done(err);}

      const html = files["test-page.html"].contents.toString();
      
      // Check that specific author is used, not siteOwner
      assert(html.includes('<meta name="author" content="Jane Doe"'), 
        "Should use specific author, not siteOwner fallback");
      
      assert(html.includes('"name": "Jane Doe"'), 
        "Should use specific author in JSON-LD");
      
      // Should not contain the siteOwner
      assert(!html.includes('Werner Glinka'), 
        "Should not include siteOwner when specific author is provided");
      
      done();
    });
  });

  it("should use card author when available", (done) => {
    const metalsmith = Metalsmith("test/fixtures/html")
      .metadata({
        site: {
          url: "https://example.com",
          title: "Test Site",
          siteOwner: "Werner Glinka"
        }
      });

    const files = {
      "blog-post.html": {
        title: "Blog Post",
        date: "2025-01-01",
        card: {
          author: "Marie Curie",
          title: "Amazing Discovery"
        },
        contents: Buffer.from("<html><head></head><body><h1>Blog Post</h1></body></html>")
      }
    };

    metalsmith.files = () => files;
    
    const plugin = seo({
      hostname: "https://example.com"
    });
    plugin(files, metalsmith, (err) => {
      if (err) {return done(err);}

      const html = files["blog-post.html"].contents.toString();
      
      // Check that card author is used over siteOwner
      assert(html.includes('<meta name="author" content="Marie Curie"'), 
        "Should use card author over siteOwner fallback");
      
      assert(html.includes('"name": "Marie Curie"'), 
        "Should use card author in JSON-LD");
      
      done();
    });
  });

  it("should handle array authors from card and join them", (done) => {
    const metalsmith = Metalsmith("test/fixtures/html")
      .metadata({
        site: {
          url: "https://example.com",
          title: "Test Site",
          siteOwner: "Werner Glinka"
        }
      });

    const files = {
      "collaboration.html": {
        title: "Collaboration Post",
        date: "2025-01-01",
        card: {
          author: ["Albert Einstein", "Isaac Newton"],
          title: "Physics Collaboration"
        },
        contents: Buffer.from("<html><head></head><body><h1>Collaboration</h1></body></html>")
      }
    };

    metalsmith.files = () => files;
    
    const plugin = seo({
      hostname: "https://example.com"
    });
    plugin(files, metalsmith, (err) => {
      if (err) {return done(err);}

      const html = files["collaboration.html"].contents.toString();
      
      // Check that array authors are joined with comma
      assert(html.includes('<meta name="author" content="Albert Einstein, Isaac Newton"'), 
        "Should join array authors with comma");
      
      assert(html.includes('"name": "Albert Einstein, Isaac Newton"'), 
        "Should join array authors in JSON-LD");
      
      done();
    });
  });

  it("should work with plugin defaults when no site metadata", (done) => {
    const metalsmith = Metalsmith("test/fixtures/html");

    const files = {
      "no-metadata-page.html": {
        title: "Page Without Site Metadata",
        contents: Buffer.from("<html><head></head><body><h1>Test</h1></body></html>")
      }
    };

    metalsmith.files = () => files;
    
    const plugin = seo({
      hostname: "https://example.com",
      defaults: {
        siteOwner: "Plugin Default Author"
      }
    });
    
    plugin(files, metalsmith, (err) => {
      if (err) {return done(err);}

      const html = files["no-metadata-page.html"].contents.toString();
      
      // Check that plugin default is used
      assert(html.includes('<meta name="author" content="Plugin Default Author"'), 
        "Should use plugin default siteOwner");
      
      done();
    });
  });
});