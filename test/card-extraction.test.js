/**
 * Test that the plugin correctly extracts metadata from card objects
 */

import assert from "assert";
import { extractMetadata } from "../src/processors/metadata-extractor.js";

describe("Card object metadata extraction", () => {
  it("should extract title, date, and author from card object", () => {
    const frontmatter = {
      layout: "pages/sections.njk",
      draft: false,
      seo: {
        description: "SEO description override"
      },
      card: {
        title: "Architecture Philosophy",
        date: "2025-06-02",
        author: ["Albert Einstein", "Isaac Newton"],
        image: "/assets/images/sample9.jpg",
        excerpt: "This starter embodies several key principles..."
      },
      contents: Buffer.from("Some content")
    };

    const options = {
      hostname: "https://example.com",
      seoProperty: "seo",
      defaults: {},
      fallbacks: {}
    };

    const metadata = extractMetadata("test.html", frontmatter, options);

    // Check title came from card
    assert.strictEqual(metadata.title, "Architecture Philosophy");

    // Check date came from card
    assert(metadata.publishDate.includes("2025-06-02"));

    // Check author came from card (joined array)
    assert.strictEqual(metadata.author, "Albert Einstein, Isaac Newton");

    // Check description came from seo object (higher priority)
    assert.strictEqual(metadata.description, "SEO description override");

    // Check image came from card
    assert.strictEqual(metadata.image, "https://example.com/assets/images/sample9.jpg");
  });

  it("should handle priority chain: seo > card > root > defaults", () => {
    const frontmatter = {
      title: "Root Title",
      date: "2025-01-01",
      author: "Root Author",
      card: {
        title: "Card Title",
        date: "2025-02-02",
        author: "Card Author"
      },
      seo: {
        title: "SEO Title"
        // No date in seo, should fall back to card
      },
      contents: Buffer.from("Some content")
    };

    const options = {
      hostname: "https://example.com",
      seoProperty: "seo",
      defaults: {
        author: "Default Author"
      },
      fallbacks: {}
    };

    const metadata = extractMetadata("test.html", frontmatter, options);

    // Title should come from seo (highest priority)
    assert.strictEqual(metadata.title, "SEO Title");

    // Date should come from card (seo doesn't have it)
    assert(metadata.publishDate.includes("2025-02-02"));

    // Author should come from card (seo doesn't have it)
    assert.strictEqual(metadata.author, "Card Author");
  });

  it("should handle single author in card", () => {
    const frontmatter = {
      card: {
        author: "Single Author"
      },
      contents: Buffer.from("Some content")
    };

    const options = {
      hostname: "https://example.com",
      seoProperty: "seo",
      defaults: {},
      fallbacks: {}
    };

    const metadata = extractMetadata("test.html", frontmatter, options);

    assert.strictEqual(metadata.author, "Single Author");
  });

  it("should fall back to root when card doesn't exist", () => {
    const frontmatter = {
      title: "Root Title",
      date: "2025-01-01",
      author: "Root Author",
      contents: Buffer.from("Some content")
    };

    const options = {
      hostname: "https://example.com",
      seoProperty: "seo",
      defaults: {},
      fallbacks: {}
    };

    const metadata = extractMetadata("test.html", frontmatter, options);

    assert.strictEqual(metadata.title, "Root Title");
    assert(metadata.publishDate.includes("2025-01-01"));
    assert.strictEqual(metadata.author, "Root Author");
  });
});