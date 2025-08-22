/**
 * @fileoverview Unified metadata extractor that processes frontmatter for SEO optimization.
 *
 * Metadata extraction priority order:
 * 1. seo object (highest priority - explicit SEO overrides)
 * 2. card object (for blog posts and content cards)
 * 3. root level properties
 * 4. configured defaults
 * 5. auto-generated content (lowest priority)
 */

import { get } from "../utils/object-utils.js";

/**
 * Extracts a property value following the priority chain:
 * 1. seo object (highest priority)
 * 2. card object 
 * 3. root level (using fallback path)
 * 4. default value
 * 
 * @param {Object} seoData - The seo object from frontmatter
 * @param {Object} frontmatter - The complete frontmatter object
 * @param {string|Object} propertyConfig - Property name as string, or object with paths for each location
 *   If string: used for all locations
 *   If object: { seo: 'seoPropertyName', card: 'cardPropertyName', root: 'rootPropertyName' }
 * @param {string} [fallbackPath] - Additional fallback path at root level
 * @param {*} [defaultValue] - Default value if not found anywhere
 * @returns {*} The extracted value
 */
function extractWithPriority(seoData, frontmatter, propertyConfig, fallbackPath, defaultValue) {
  let seoProperty, cardProperty, rootProperty;
  
  if (typeof propertyConfig === 'string') {
    // Use same property name for all locations
    seoProperty = propertyConfig;
    cardProperty = propertyConfig;
    rootProperty = fallbackPath || propertyConfig;
  } else {
    // Use specific property names for each location
    seoProperty = propertyConfig.seo;
    cardProperty = propertyConfig.card;
    rootProperty = propertyConfig.root || fallbackPath;
  }
  
  // 1. Check seo object first (highest priority)
  if (seoProperty) {
    const seoValue = get(seoData, seoProperty);
    if (seoValue !== undefined && seoValue !== null) {
      return seoValue;
    }
  }
  
  // 2. Check card object
  if (cardProperty) {
    const cardValue = get(frontmatter, `card.${cardProperty}`);
    if (cardValue !== undefined && cardValue !== null) {
      return cardValue;
    }
  }
  
  // 3. Check root level
  if (rootProperty) {
    const rootValue = get(frontmatter, rootProperty);
    if (rootValue !== undefined && rootValue !== null) {
      return rootValue;
    }
  }
  
  // 4. Return default value
  return defaultValue;
}

/**
 * @typedef {Object} ExtractedMetadata
 * @property {string} title - Page title
 * @property {string} description - Page description
 * @property {string} [image] - Social sharing image URL
 * @property {string} [canonicalURL] - Canonical URL
 * @property {string} [robots] - Robots directive
 * @property {boolean} [noIndex] - Whether page should be excluded from indexing
 * @property {string} [type] - Content type (article, page, product, etc.)
 * @property {Date|string} [publishDate] - Publication date
 * @property {Date|string} [modifiedDate] - Last modified date
 * @property {string} [author] - Author name
 * @property {string[]} [keywords] - Keywords/tags
 * @property {number} [wordCount] - Word count from content
 * @property {string} [readingTime] - Estimated reading time
 */

/**
 * @typedef {Object} MetadataOptions
 * @property {string} hostname - Base hostname for generating URLs
 * @property {string} [seoProperty='seo'] - Frontmatter property containing SEO data
 * @property {Object} [defaults] - Default values for missing metadata
 * @property {Object} [fallbacks] - Fallback property mappings
 */

/**
 * Extracts and normalizes metadata from file frontmatter
 * @param {string} filePath - File path relative to source
 * @param {Object} frontmatter - File frontmatter and content
 * @param {MetadataOptions} options - Extraction options
 * @returns {ExtractedMetadata} Extracted and normalized metadata
 */
export function extractMetadata(filePath, frontmatter, options) {
  const {
    hostname,
    seoProperty = "seo",
    defaults = {},
    fallbacks = {},
  } = options;

  // Ensure hostname is a string
  const hostnameStr = String(hostname || "");

  // Get SEO-specific metadata (highest priority)
  const seoData = get(frontmatter, seoProperty) || {};

  // Extract metadata with fallback chain: seo -> defaults -> fallbacks -> auto-generated
  const metadata = {
    // Core SEO properties
    title: extractTitle(seoData, frontmatter, defaults, fallbacks),
    description: extractDescription(seoData, frontmatter, defaults, fallbacks),
    image: extractImage(seoData, frontmatter, defaults, fallbacks, hostnameStr),
    canonicalURL: extractCanonicalURL(seoData, filePath, hostnameStr),
    robots: extractRobots(seoData, defaults),
    noIndex: extractNoIndex(seoData),
    type: extractContentType(seoData, frontmatter),

    // Dates
    publishDate: extractPublishDate(seoData, frontmatter, fallbacks),
    modifiedDate: extractModifiedDate(seoData, frontmatter, fallbacks),

    // Author and content metadata
    author: extractAuthor(seoData, frontmatter, fallbacks),
    keywords: extractKeywords(seoData, frontmatter, fallbacks),

    // Content analysis
    wordCount: extractWordCount(frontmatter),
    readingTime: null, // Will be calculated after word count
  };

  // Calculate reading time
  if (metadata.wordCount) {
    metadata.readingTime = calculateReadingTime(metadata.wordCount);
  }

  return metadata;
}

/**
 * Extract title with fallback chain
 */
function extractTitle(seoData, frontmatter, defaults, fallbacks) {
  const extracted = extractWithPriority(
    seoData, 
    frontmatter, 
    "title", 
    fallbacks.title || "title"
  );
  
  return extracted || defaults.title || "Untitled";
}

/**
 * Extract description with fallback chain
 */
function extractDescription(seoData, frontmatter, defaults, fallbacks) {
  // Note: card uses "excerpt" while seo uses "description"
  const extracted = extractWithPriority(
    seoData,
    frontmatter,
    {
      seo: "description",
      card: "excerpt",  // card uses "excerpt" instead of "description"
      root: fallbacks.description || "excerpt"
    }
  );
  
  return extracted || defaults.description || autoGenerateDescription(frontmatter.contents);
}

/**
 * Extract image with fallback chain
 */
function extractImage(seoData, frontmatter, defaults, fallbacks, hostname) {
  // Check both "image" and "socialImage" in seo
  const seoImage = seoData.image || seoData.socialImage;
  
  const image = 
    seoImage ||
    extractWithPriority(
      {}, // Empty seo since we already checked it
      frontmatter,
      "image",
      fallbacks.image || "featured_image"
    ) ||
    defaults.socialImage;

  // Convert relative URLs to absolute
  if (image && !image.startsWith("http")) {
    return `${hostname.replace(/\/$/, "")}${image.startsWith("/") ? "" : "/"}${image}`;
  }

  return image;
}

/**
 * Extract canonical URL
 */
function extractCanonicalURL(seoData, filePath, hostname) {
  if (seoData.canonicalURL) {
    return seoData.canonicalURL;
  }

  // Auto-generate from file path
  const cleanPath = filePath.replace(/\.html?$/, "").replace(/\/index$/, "");

  return `${hostname.replace(/\/$/, "")}/${cleanPath}`.replace(/\/+/g, "/");
}

/**
 * Extract robots directive
 */
function extractRobots(seoData, defaults) {
  return seoData.robots || defaults.robots || "index,follow";
}

/**
 * Extract noIndex flag
 */
function extractNoIndex(seoData) {
  return Boolean(seoData.noIndex);
}

/**
 * Auto-detect content type
 */
function extractContentType(seoData, frontmatter) {
  if (seoData.type) {
    return seoData.type;
  }

  // Use our centralized extraction for date and author
  const hasDate = extractWithPriority(seoData, frontmatter, "date", "date");
  const hasAuthor = extractWithPriority(seoData, frontmatter, "author", "author");
  const hasTags = get(frontmatter, "tags") || get(frontmatter, "card.tags");
  
  // Auto-detect based on frontmatter properties
  if (hasDate && (hasAuthor || hasTags)) {
    return "article";
  }

  if (frontmatter.price || frontmatter.sku) {
    return "product";
  }

  if (frontmatter.address || frontmatter.phone) {
    return "local-business";
  }

  return "page";
}

/**
 * Extract publish date
 */
function extractPublishDate(seoData, frontmatter, fallbacks) {
  const date = extractWithPriority(
    seoData,
    frontmatter,
    {
      seo: "publishDate",
      card: "date",  // card uses "date" instead of "publishDate"
      root: fallbacks.publishDate || "date"
    }
  );
  
  return normalizeDate(date);
}

/**
 * Extract modified date
 */
function extractModifiedDate(seoData, frontmatter, fallbacks) {
  const date =
    get(seoData, "modifiedDate") ||
    get(frontmatter, fallbacks.modifiedDate || "updated");

  return normalizeDate(date);
}

/**
 * Extract author information
 */
function extractAuthor(seoData, frontmatter, fallbacks) {
  // Try the standard extraction first
  let author = extractWithPriority(
    seoData,
    frontmatter,
    "author",
    fallbacks.author || "author.name"
  );
  
  // If not found and we used author.name as fallback, also try just "author"
  if (!author && (!fallbacks.author || fallbacks.author === "author.name")) {
    author = get(frontmatter, "author");
  }

  // Handle array of authors (join them)
  if (Array.isArray(author)) {
    return author.join(", ");
  }

  return author;
}

/**
 * Extract keywords/tags
 */
function extractKeywords(seoData, frontmatter, fallbacks) {
  const keywords = extractWithPriority(
    seoData,
    frontmatter,
    {
      seo: "keywords",
      card: "tags",  // card might use "tags" instead of "keywords"
      root: fallbacks.keywords || "tags"
    }
  );

  if (Array.isArray(keywords)) {
    return keywords;
  }

  if (typeof keywords === "string") {
    return keywords.split(",").map((k) => k.trim());
  }

  return [];
}

/**
 * Extract word count from content
 */
function extractWordCount(frontmatter) {
  if (!Buffer.isBuffer(frontmatter.contents)) {
    return 0;
  }

  const content = frontmatter.contents.toString();
  const words = content
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .split(" ")
    .filter((word) => word.length > 0);

  return words.length;
}

/**
 * Calculate reading time from word count
 */
function calculateReadingTime(wordCount) {
  const wordsPerMinute = 200;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}

/**
 * Auto-generate description from content
 */
function autoGenerateDescription(contents, maxLength = 160) {
  if (!Buffer.isBuffer(contents)) {
    return "";
  }

  const content = contents
    .toString()
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  if (content.length <= maxLength) {
    return content;
  }

  // Find the last complete sentence within the limit
  const truncated = content.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf(".");
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSentence > maxLength * 0.6) {
    return content.substring(0, lastSentence + 1);
  }

  if (lastSpace > maxLength * 0.8) {
    return `${content.substring(0, lastSpace)}...`;
  }

  return `${truncated}...`;
}

/**
 * Normalize date to ISO string
 */
function normalizeDate(date) {
  if (!date) {
    return null;
  }

  if (date instanceof Date) {
    return date.toISOString();
  }

  if (typeof date === "string") {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}
