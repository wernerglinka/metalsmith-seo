import { load } from 'cheerio';
import path from 'path';
import { SitemapStream, streamToPromise } from 'sitemap';

/**
 * @fileoverview Utility functions for object manipulation.
 */

/**
 * Safely gets a nested property value from an object using dot notation.
 * @param {Object} obj - The object to query
 * @param {string} pathStr - The property path (e.g., 'a.b.c')
 * @param {*} [defaultValue] - Value to return if the property is undefined
 * @returns {*} The property value or defaultValue
 */
const get = (obj, pathStr, defaultValue) => {
  if (!obj || !pathStr || typeof pathStr !== "string") {
    return defaultValue;
  }
  const keys = pathStr.split(".");
  let result = obj;
  for (const key of keys) {
    var _result;
    result = (_result = result) == null ? void 0 : _result[key];
    if (result === undefined) {
      return defaultValue;
    }
  }
  return result;
};

/**
 * Creates a new object with only the properties that pass the predicate test.
 * @param {Object} obj - The source object
 * @param {function(*): boolean} predicate - Function to test each property value
 * @returns {Object} New object with filtered properties
 */
const pick = (obj, predicate) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (predicate(value)) {
      result[key] = value;
    }
  }
  return result;
};

/**
 * Identity function that returns the input value unchanged.
 * @param {*} value - Any value
 * @returns {*} The same value
 */
const identity = value => value;

/**
 * @fileoverview Unified metadata extractor that processes frontmatter for SEO optimization.
 */

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
function extractMetadata(filePath, frontmatter, options) {
  const {
    hostname,
    seoProperty = 'seo',
    defaults = {},
    fallbacks = {}
  } = options;

  // Ensure hostname is a string
  const hostnameStr = String(hostname || '');

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
    readingTime: null // Will be calculated after word count
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
  return seoData.title || defaults.title || get(frontmatter, fallbacks.title || 'title') || 'Untitled';
}

/**
 * Extract description with fallback chain
 */
function extractDescription(seoData, frontmatter, defaults, fallbacks) {
  return seoData.description || defaults.description || get(frontmatter, fallbacks.description || 'excerpt') || autoGenerateDescription(frontmatter.contents);
}

/**
 * Extract image with fallback chain
 */
function extractImage(seoData, frontmatter, defaults, fallbacks, hostname) {
  const image = seoData.image || seoData.socialImage || defaults.socialImage || get(frontmatter, fallbacks.image || 'featured_image');

  // Convert relative URLs to absolute
  if (image && !image.startsWith('http')) {
    return `${hostname.replace(/\/$/, '')}${image.startsWith('/') ? '' : '/'}${image}`;
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
  const cleanPath = filePath.replace(/\.html?$/, '').replace(/\/index$/, '');
  return `${hostname.replace(/\/$/, '')}/${cleanPath}`.replace(/\/+/g, '/');
}

/**
 * Extract robots directive
 */
function extractRobots(seoData, defaults) {
  return seoData.robots || defaults.robots || 'index,follow';
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

  // Auto-detect based on frontmatter properties
  if (frontmatter.date && (frontmatter.author || frontmatter.tags)) {
    return 'article';
  }
  if (frontmatter.price || frontmatter.sku) {
    return 'product';
  }
  if (frontmatter.address || frontmatter.phone) {
    return 'local-business';
  }
  return 'page';
}

/**
 * Extract publish date
 */
function extractPublishDate(seoData, frontmatter, fallbacks) {
  const date = get(seoData, 'publishDate') || get(frontmatter, fallbacks.publishDate || 'date');
  return normalizeDate(date);
}

/**
 * Extract modified date
 */
function extractModifiedDate(seoData, frontmatter, fallbacks) {
  const date = get(seoData, 'modifiedDate') || get(frontmatter, fallbacks.modifiedDate || 'updated');
  return normalizeDate(date);
}

/**
 * Extract author information
 */
function extractAuthor(seoData, frontmatter, fallbacks) {
  return get(seoData, 'author') || get(frontmatter, fallbacks.author || 'author.name') || get(frontmatter, 'author');
}

/**
 * Extract keywords/tags
 */
function extractKeywords(seoData, frontmatter, fallbacks) {
  const keywords = get(seoData, 'keywords') || get(frontmatter, fallbacks.keywords || 'tags') || get(frontmatter, 'keywords');
  if (Array.isArray(keywords)) {
    return keywords;
  }
  if (typeof keywords === 'string') {
    return keywords.split(',').map(k => k.trim());
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
  const words = content.replace(/<[^>]*>/g, '') // Remove HTML tags
  .replace(/\s+/g, ' ') // Normalize whitespace
  .trim().split(' ').filter(word => word.length > 0);
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
    return '';
  }
  const content = contents.toString().replace(/<[^>]*>/g, '') // Remove HTML tags
  .replace(/\s+/g, ' ') // Normalize whitespace
  .trim();
  if (content.length <= maxLength) {
    return content;
  }

  // Find the last complete sentence within the limit
  const truncated = content.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSentence > maxLength * 0.6) {
    return content.substring(0, lastSentence + 1);
  }
  if (lastSpace > maxLength * 0.8) {
    return content.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
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
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

/**
 * @fileoverview Generator for basic HTML meta tags.
 */

/**
 * @typedef {Object} MetaTagsResult
 * @property {string} title - Title tag content
 * @property {Array<Object>} metaTags - Array of meta tag objects
 * @property {Array<Object>} linkTags - Array of link tag objects
 */

/**
 * Generates basic HTML meta tags from extracted metadata
 * @param {Object} metadata - Extracted metadata object
 * @param {Object} siteConfig - Site-wide configuration
 * @returns {MetaTagsResult} Generated meta tags
 */
function generateMetaTags(metadata, siteConfig = {}) {
  const metaTags = [];
  const linkTags = [];

  // Basic meta tags
  if (metadata.description) {
    metaTags.push({
      name: 'description',
      content: metadata.description
    });
  }
  if (metadata.keywords && metadata.keywords.length > 0) {
    metaTags.push({
      name: 'keywords',
      content: Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : metadata.keywords
    });
  }

  // Robots directive
  const robots = generateRobotsDirective(metadata, siteConfig);
  if (robots) {
    metaTags.push({
      name: 'robots',
      content: robots
    });
  }

  // Author
  if (metadata.author) {
    metaTags.push({
      name: 'author',
      content: metadata.author
    });
  }

  // Viewport (always include for mobile optimization)
  metaTags.push({
    name: 'viewport',
    content: 'width=device-width, initial-scale=1.0'
  });

  // Canonical URL
  if (metadata.canonicalURL) {
    linkTags.push({
      rel: 'canonical',
      href: metadata.canonicalURL
    });
  }

  // Theme color (if specified in site config)
  if (siteConfig.themeColor) {
    metaTags.push({
      name: 'theme-color',
      content: siteConfig.themeColor
    });
  }

  // Additional technical meta tags
  addTechnicalMetaTags(metaTags, metadata, siteConfig);
  return {
    title: metadata.title,
    metaTags,
    linkTags
  };
}

/**
 * Generates robots directive based on metadata and configuration
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 * @returns {string|null} Robots directive string
 */
function generateRobotsDirective(metadata, siteConfig) {
  if (metadata.noIndex) {
    return 'noindex,nofollow';
  }
  if (metadata.robots) {
    return metadata.robots;
  }

  // Default based on content type
  switch (metadata.type) {
    case 'article':
      return 'index,follow';
    case 'page':
      return 'index,follow';
    case 'product':
      return 'index,follow';
    default:
      return siteConfig.defaultRobots || 'index,follow';
  }
}

/**
 * Adds technical meta tags for advanced SEO
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function addTechnicalMetaTags(metaTags, metadata, siteConfig) {
  // Content language
  if (siteConfig.language) {
    metaTags.push({
      httpEquiv: 'content-language',
      content: siteConfig.language
    });
  }

  // Publisher
  if (siteConfig.publisher) {
    metaTags.push({
      name: 'publisher',
      content: siteConfig.publisher
    });
  }

  // Copyright
  if (siteConfig.copyright) {
    metaTags.push({
      name: 'copyright',
      content: siteConfig.copyright
    });
  }

  // Googlebot specific directives
  const googlebotDirectives = [];
  if (siteConfig.maxSnippet) {
    googlebotDirectives.push(`max-snippet:${siteConfig.maxSnippet}`);
  }
  if (siteConfig.maxImagePreview) {
    googlebotDirectives.push(`max-image-preview:${siteConfig.maxImagePreview}`);
  }
  if (siteConfig.maxVideoPreview) {
    googlebotDirectives.push(`max-video-preview:${siteConfig.maxVideoPreview}`);
  }
  if (googlebotDirectives.length > 0) {
    metaTags.push({
      name: 'googlebot',
      content: googlebotDirectives.join(',')
    });
  }

  // Article-specific meta tags
  if (metadata.type === 'article') {
    addArticleMetaTags(metaTags, metadata);
  }
}

/**
 * Adds article-specific meta tags
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 */
function addArticleMetaTags(metaTags, metadata) {
  if (metadata.publishDate) {
    const date = new Date(metadata.publishDate);
    metaTags.push({
      name: 'article:published_time',
      content: date.toISOString()
    });
  }
  if (metadata.modifiedDate) {
    const date = new Date(metadata.modifiedDate);
    metaTags.push({
      name: 'article:modified_time',
      content: date.toISOString()
    });
  }
  if (metadata.author) {
    metaTags.push({
      name: 'article:author',
      content: metadata.author
    });
  }
  if (metadata.keywords && metadata.keywords.length > 0) {
    metadata.keywords.forEach(keyword => {
      metaTags.push({
        name: 'article:tag',
        content: keyword
      });
    });
  }
}

/**
 * @fileoverview Generator for Open Graph meta tags.
 */

/**
 * @typedef {Object} OpenGraphResult
 * @property {Array<Object>} metaTags - Array of Open Graph meta tag objects
 */

/**
 * Generates Open Graph meta tags from extracted metadata
 * @param {Object} metadata - Extracted metadata object
 * @param {Object} siteConfig - Site-wide configuration
 * @returns {OpenGraphResult} Generated Open Graph tags
 */
function generateOpenGraphTags(metadata, siteConfig = {}) {
  const metaTags = [];

  // Core Open Graph tags
  addCoreOpenGraphTags(metaTags, metadata, siteConfig);

  // Type-specific tags
  switch (metadata.type) {
    case 'article':
      addArticleOpenGraphTags(metaTags, metadata);
      break;
    case 'product':
      addProductOpenGraphTags(metaTags, metadata);
      break;
    case 'profile':
      addProfileOpenGraphTags(metaTags, metadata);
      break;
  }

  // Site-specific tags
  addSiteOpenGraphTags(metaTags, siteConfig);
  return {
    metaTags
  };
}

/**
 * Adds core Open Graph tags (required for all content)
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function addCoreOpenGraphTags(metaTags, metadata, siteConfig) {
  // og:title (required)
  if (metadata.title) {
    metaTags.push({
      property: 'og:title',
      content: metadata.title
    });
  }

  // og:type (required)
  const ogType = mapContentTypeToOGType(metadata.type);
  metaTags.push({
    property: 'og:type',
    content: ogType
  });

  // og:url (required)
  if (metadata.canonicalURL) {
    metaTags.push({
      property: 'og:url',
      content: metadata.canonicalURL
    });
  }

  // og:description
  if (metadata.description) {
    metaTags.push({
      property: 'og:description',
      content: metadata.description
    });
  }

  // og:image (recommended)
  if (metadata.image) {
    metaTags.push({
      property: 'og:image',
      content: metadata.image
    });

    // Add image metadata if available
    addImageMetadata(metaTags, metadata, siteConfig);
  }

  // og:site_name
  if (siteConfig.siteName) {
    metaTags.push({
      property: 'og:site_name',
      content: siteConfig.siteName
    });
  }

  // og:locale
  const locale = siteConfig.locale || siteConfig.language || 'en_US';
  metaTags.push({
    property: 'og:locale',
    content: locale
  });
}

/**
 * Adds image metadata for Open Graph
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function addImageMetadata(metaTags, metadata, siteConfig) {
  // Default image dimensions for social sharing
  const defaultWidth = siteConfig.ogImageWidth || 1200;
  const defaultHeight = siteConfig.ogImageHeight || 630;
  metaTags.push({
    property: 'og:image:width',
    content: String(defaultWidth)
  });
  metaTags.push({
    property: 'og:image:height',
    content: String(defaultHeight)
  });

  // Image alt text (accessibility)
  const imageAlt = metadata.imageAlt || metadata.title || 'Image';
  metaTags.push({
    property: 'og:image:alt',
    content: imageAlt
  });

  // Image type (if known)
  if (metadata.image) {
    const imageType = getImageType(metadata.image);
    if (imageType) {
      metaTags.push({
        property: 'og:image:type',
        content: imageType
      });
    }
  }
}

/**
 * Adds article-specific Open Graph tags
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 */
function addArticleOpenGraphTags(metaTags, metadata) {
  // article:published_time
  if (metadata.publishDate) {
    metaTags.push({
      property: 'article:published_time',
      content: new Date(metadata.publishDate).toISOString()
    });
  }

  // article:modified_time
  if (metadata.modifiedDate) {
    metaTags.push({
      property: 'article:modified_time',
      content: new Date(metadata.modifiedDate).toISOString()
    });
  }

  // article:author
  if (metadata.author) {
    metaTags.push({
      property: 'article:author',
      content: metadata.author
    });
  }

  // article:section
  if (metadata.section) {
    metaTags.push({
      property: 'article:section',
      content: metadata.section
    });
  }

  // article:tag (multiple tags)
  if (metadata.keywords && metadata.keywords.length > 0) {
    metadata.keywords.forEach(tag => {
      metaTags.push({
        property: 'article:tag',
        content: tag
      });
    });
  }

  // Reading time (custom property)
  if (metadata.readingTime) {
    metaTags.push({
      property: 'article:reading_time',
      content: metadata.readingTime
    });
  }
}

/**
 * Adds product-specific Open Graph tags
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 */
function addProductOpenGraphTags(metaTags, metadata) {
  // product:brand
  if (metadata.brand) {
    metaTags.push({
      property: 'product:brand',
      content: metadata.brand
    });
  }

  // product:availability
  if (metadata.availability) {
    metaTags.push({
      property: 'product:availability',
      content: metadata.availability
    });
  }

  // product:condition
  if (metadata.condition) {
    metaTags.push({
      property: 'product:condition',
      content: metadata.condition
    });
  }

  // product:price
  if (metadata.price) {
    metaTags.push({
      property: 'product:price:amount',
      content: String(metadata.price)
    });
  }

  // product:price:currency
  if (metadata.currency) {
    metaTags.push({
      property: 'product:price:currency',
      content: metadata.currency
    });
  }
}

/**
 * Adds profile-specific Open Graph tags
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 */
function addProfileOpenGraphTags(metaTags, metadata) {
  // profile:first_name
  if (metadata.firstName) {
    metaTags.push({
      property: 'profile:first_name',
      content: metadata.firstName
    });
  }

  // profile:last_name
  if (metadata.lastName) {
    metaTags.push({
      property: 'profile:last_name',
      content: metadata.lastName
    });
  }

  // profile:username
  if (metadata.username) {
    metaTags.push({
      property: 'profile:username',
      content: metadata.username
    });
  }
}

/**
 * Adds site-specific Open Graph tags
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} siteConfig - Site configuration
 */
function addSiteOpenGraphTags(metaTags, siteConfig) {
  // Facebook App ID
  if (siteConfig.facebookAppId) {
    metaTags.push({
      property: 'fb:app_id',
      content: siteConfig.facebookAppId
    });
  }

  // Facebook Admins
  if (siteConfig.facebookAdmins) {
    const admins = Array.isArray(siteConfig.facebookAdmins) ? siteConfig.facebookAdmins : [siteConfig.facebookAdmins];
    admins.forEach(admin => {
      metaTags.push({
        property: 'fb:admins',
        content: String(admin)
      });
    });
  }
}

/**
 * Maps content types to Open Graph types
 * @param {string} contentType - Internal content type
 * @returns {string} Open Graph type
 */
function mapContentTypeToOGType(contentType) {
  const typeMap = {
    'article': 'article',
    'product': 'product',
    'profile': 'profile',
    'page': 'website',
    'local-business': 'business.business'
  };
  return typeMap[contentType] || 'website';
}

/**
 * Determines image MIME type from file extension
 * @param {string} imageUrl - Image URL
 * @returns {string|null} MIME type
 */
function getImageType(imageUrl) {
  var _imageUrl$split$pop;
  const extension = (_imageUrl$split$pop = imageUrl.split('.').pop()) == null ? void 0 : _imageUrl$split$pop.toLowerCase();
  const typeMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml'
  };
  return typeMap[extension] || null;
}

/**
 * @fileoverview Generator for Twitter Card meta tags.
 */

/**
 * @typedef {Object} TwitterCardResult
 * @property {Array<Object>} metaTags - Array of Twitter Card meta tag objects
 */

/**
 * Generates Twitter Card meta tags from extracted metadata
 * @param {Object} metadata - Extracted metadata object
 * @param {Object} siteConfig - Site-wide configuration
 * @returns {TwitterCardResult} Generated Twitter Card tags
 */
function generateTwitterCardTags(metadata, siteConfig = {}) {
  const metaTags = [];

  // Determine card type
  const cardType = determineCardType(metadata, siteConfig);

  // Core Twitter Card tags
  addCoreTwitterTags(metaTags, metadata, siteConfig, cardType);

  // Card type-specific tags
  switch (cardType) {
    case 'summary_large_image':
      addSummaryLargeImageTags(metaTags, metadata);
      break;
    case 'summary':
      addSummaryTags(metaTags, metadata);
      break;
    case 'app':
      addAppTags(metaTags, metadata, siteConfig);
      break;
    case 'player':
      addPlayerTags(metaTags, metadata);
      break;
    default:
      // Default to summary
      addSummaryTags(metaTags, metadata);
      break;
  }
  return {
    metaTags
  };
}

/**
 * Determines the appropriate Twitter Card type
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 * @returns {string} Twitter Card type
 */
function determineCardType(metadata, siteConfig) {
  // Allow explicit override in site config or metadata
  if (metadata.twitterCard) {
    return metadata.twitterCard;
  }
  if (siteConfig.twitterCardType) {
    return siteConfig.twitterCardType;
  }

  // Auto-determine based on content
  if (metadata.image) {
    return 'summary_large_image';
  }
  if (metadata.type === 'video' || metadata.videoUrl) {
    return 'player';
  }
  if (metadata.type === 'app' || metadata.appId) {
    return 'app';
  }
  return 'summary';
}

/**
 * Adds core Twitter Card tags (common to all card types)
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 * @param {string} cardType - Twitter card type
 */
function addCoreTwitterTags(metaTags, metadata, siteConfig, cardType) {
  // twitter:card (required)
  metaTags.push({
    name: 'twitter:card',
    content: cardType
  });

  // twitter:site (recommended)
  if (siteConfig.twitterSite) {
    metaTags.push({
      name: 'twitter:site',
      content: ensureTwitterHandle(siteConfig.twitterSite)
    });
  }

  // twitter:creator (optional)
  const creator = metadata.twitterCreator || metadata.author || siteConfig.twitterCreator;
  if (creator) {
    metaTags.push({
      name: 'twitter:creator',
      content: ensureTwitterHandle(creator)
    });
  }

  // twitter:title (falls back to og:title)
  if (metadata.title) {
    // Twitter titles should be shorter than OG titles
    const twitterTitle = truncateTitle(metadata.title, 70);
    metaTags.push({
      name: 'twitter:title',
      content: twitterTitle
    });
  }

  // twitter:description (falls back to og:description)
  if (metadata.description) {
    // Twitter descriptions should be shorter
    const twitterDescription = truncateDescription(metadata.description, 200);
    metaTags.push({
      name: 'twitter:description',
      content: twitterDescription
    });
  }
}

/**
 * Adds tags specific to summary_large_image cards
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 */
function addSummaryLargeImageTags(metaTags, metadata) {
  if (metadata.image) {
    metaTags.push({
      name: 'twitter:image',
      content: metadata.image
    });

    // Image alt text (accessibility)
    const imageAlt = metadata.imageAlt || metadata.title || 'Image';
    metaTags.push({
      name: 'twitter:image:alt',
      content: imageAlt
    });
  }
}

/**
 * Adds tags specific to summary cards
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 */
function addSummaryTags(metaTags, metadata) {
  if (metadata.image) {
    metaTags.push({
      name: 'twitter:image',
      content: metadata.image
    });

    // Image alt text (accessibility)
    const imageAlt = metadata.imageAlt || metadata.title || 'Image';
    metaTags.push({
      name: 'twitter:image:alt',
      content: imageAlt
    });
  }
}

/**
 * Adds tags specific to app cards
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function addAppTags(metaTags, metadata, siteConfig) {
  // iOS app
  if (metadata.iosAppId || siteConfig.iosAppId) {
    metaTags.push({
      name: 'twitter:app:id:iphone',
      content: metadata.iosAppId || siteConfig.iosAppId
    });
  }
  if (metadata.iosAppUrl || siteConfig.iosAppUrl) {
    metaTags.push({
      name: 'twitter:app:url:iphone',
      content: metadata.iosAppUrl || siteConfig.iosAppUrl
    });
  }

  // Android app
  if (metadata.androidAppId || siteConfig.androidAppId) {
    metaTags.push({
      name: 'twitter:app:id:googleplay',
      content: metadata.androidAppId || siteConfig.androidAppId
    });
  }
  if (metadata.androidAppUrl || siteConfig.androidAppUrl) {
    metaTags.push({
      name: 'twitter:app:url:googleplay',
      content: metadata.androidAppUrl || siteConfig.androidAppUrl
    });
  }

  // App name
  if (metadata.appName || siteConfig.appName) {
    metaTags.push({
      name: 'twitter:app:name:iphone',
      content: metadata.appName || siteConfig.appName
    });
    metaTags.push({
      name: 'twitter:app:name:googleplay',
      content: metadata.appName || siteConfig.appName
    });
  }
}

/**
 * Adds tags specific to player cards
 * @param {Array} metaTags - Meta tags array to modify
 * @param {Object} metadata - Extracted metadata
 */
function addPlayerTags(metaTags, metadata) {
  if (metadata.videoUrl) {
    metaTags.push({
      name: 'twitter:player',
      content: metadata.videoUrl
    });
  }
  if (metadata.videoWidth) {
    metaTags.push({
      name: 'twitter:player:width',
      content: String(metadata.videoWidth)
    });
  }
  if (metadata.videoHeight) {
    metaTags.push({
      name: 'twitter:player:height',
      content: String(metadata.videoHeight)
    });
  }
  if (metadata.videoStreamUrl) {
    metaTags.push({
      name: 'twitter:player:stream',
      content: metadata.videoStreamUrl
    });
  }

  // Player image (thumbnail)
  if (metadata.image) {
    metaTags.push({
      name: 'twitter:image',
      content: metadata.image
    });
  }
}

/**
 * Ensures Twitter handle has @ prefix
 * @param {string} handle - Twitter handle
 * @returns {string} Formatted Twitter handle
 */
function ensureTwitterHandle(handle) {
  if (typeof handle !== 'string') {
    return String(handle);
  }
  const cleaned = handle.trim();
  return cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
}

/**
 * Truncates title to fit Twitter's recommendations
 * @param {string} title - Original title
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated title
 */
function truncateTitle(title, maxLength = 70) {
  if (title.length <= maxLength) {
    return title;
  }

  // Find the last space before the limit
  const truncated = title.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.8) {
    return title.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
}

/**
 * Truncates description to fit Twitter's recommendations
 * @param {string} description - Original description
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated description
 */
function truncateDescription(description, maxLength = 200) {
  if (description.length <= maxLength) {
    return description;
  }

  // Find the last complete sentence within the limit
  const truncated = description.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSentence > maxLength * 0.6) {
    return description.substring(0, lastSentence + 1);
  }
  if (lastSpace > maxLength * 0.8) {
    return description.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
}

/**
 * @fileoverview Generator for JSON-LD structured data.
 */

/**
 * @typedef {Object} JsonLdResult
 * @property {Array<Object>} schemas - Array of JSON-LD schema objects
 * @property {string} html - HTML script tag containing JSON-LD
 */

/**
 * Generates JSON-LD structured data from extracted metadata
 * @param {Object} metadata - Extracted metadata object
 * @param {Object} siteConfig - Site-wide configuration
 * @param {string} filePath - File path for context
 * @returns {JsonLdResult} Generated JSON-LD schemas
 */
function generateJsonLd(metadata, siteConfig = {}, filePath = '') {
  const schemas = [];

  // Generate schemas based on content type and configuration
  generateWebSiteSchema(schemas, siteConfig);
  generateContentSchema(schemas, metadata, siteConfig);
  generateBreadcrumbSchema(schemas, filePath, siteConfig);
  generateOrganizationSchema(schemas, siteConfig);

  // Convert schemas to JSON-LD context
  const jsonLdSchemas = schemas.map(schema => ({
    "@context": "https://schema.org",
    ...schema
  }));

  // Generate HTML script tag
  const html = generateJsonLdHtml(jsonLdSchemas);
  return {
    schemas: jsonLdSchemas,
    html
  };
}

/**
 * Generates WebSite schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} siteConfig - Site configuration
 */
function generateWebSiteSchema(schemas, siteConfig) {
  if (!siteConfig.name && !siteConfig.siteName) {
    return;
  }
  const webSiteSchema = {
    "@type": "WebSite",
    "name": siteConfig.siteName || siteConfig.name,
    "url": siteConfig.hostname || siteConfig.url
  };

  // Add search action if configured
  if (siteConfig.searchUrl) {
    webSiteSchema.potentialAction = {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${siteConfig.searchUrl}?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    };
  }

  // Add alternate name
  if (siteConfig.alternateNames) {
    webSiteSchema.alternateName = Array.isArray(siteConfig.alternateNames) ? siteConfig.alternateNames : [siteConfig.alternateNames];
  }
  schemas.push(webSiteSchema);
}

/**
 * Generates content-specific schema based on type
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function generateContentSchema(schemas, metadata, siteConfig) {
  switch (metadata.type) {
    case 'article':
      generateArticleSchema(schemas, metadata, siteConfig);
      break;
    case 'product':
      generateProductSchema(schemas, metadata);
      break;
    case 'local-business':
      generateLocalBusinessSchema(schemas, metadata, siteConfig);
      break;
    case 'page':
    default:
      generateWebPageSchema(schemas, metadata, siteConfig);
      break;
  }
}

/**
 * Generates Article schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function generateArticleSchema(schemas, metadata, siteConfig) {
  const articleSchema = {
    "@type": "Article",
    "headline": metadata.title,
    "url": metadata.canonicalURL
  };

  // Description
  if (metadata.description) {
    articleSchema.description = metadata.description;
  }

  // Image
  if (metadata.image) {
    articleSchema.image = {
      "@type": "ImageObject",
      "url": metadata.image
    };
  }

  // Dates
  if (metadata.publishDate) {
    articleSchema.datePublished = new Date(metadata.publishDate).toISOString();
  }
  if (metadata.modifiedDate) {
    articleSchema.dateModified = new Date(metadata.modifiedDate).toISOString();
  }

  // Author
  if (metadata.author) {
    articleSchema.author = {
      "@type": "Person",
      "name": metadata.author
    };
  }

  // Publisher (organization)
  if (siteConfig.organization) {
    articleSchema.publisher = generatePublisherSchema(siteConfig.organization);
  }

  // Article section
  if (metadata.section) {
    articleSchema.articleSection = metadata.section;
  }

  // Keywords
  if (metadata.keywords && metadata.keywords.length > 0) {
    articleSchema.keywords = metadata.keywords;
  }

  // Word count
  if (metadata.wordCount) {
    articleSchema.wordCount = metadata.wordCount;
  }

  // Reading time
  if (metadata.readingTime) {
    articleSchema.timeRequired = metadata.readingTime;
  }
  schemas.push(articleSchema);
}

/**
 * Generates Product schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function generateProductSchema(schemas, metadata, siteConfig) {
  const productSchema = {
    "@type": "Product",
    "name": metadata.title,
    "description": metadata.description
  };

  // Image
  if (metadata.image) {
    productSchema.image = metadata.image;
  }

  // Brand
  if (metadata.brand) {
    productSchema.brand = {
      "@type": "Brand",
      "name": metadata.brand
    };
  }

  // SKU
  if (metadata.sku) {
    productSchema.sku = metadata.sku;
  }

  // Offers
  if (metadata.price) {
    productSchema.offers = {
      "@type": "Offer",
      "price": metadata.price,
      "priceCurrency": metadata.currency || "USD",
      "availability": `https://schema.org/${metadata.availability || "InStock"}`,
      "condition": `https://schema.org/${metadata.condition || "NewCondition"}`
    };
  }

  // Aggregate rating
  if (metadata.rating) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": metadata.rating,
      "ratingCount": metadata.ratingCount || 1
    };
  }
  schemas.push(productSchema);
}

/**
 * Generates LocalBusiness schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function generateLocalBusinessSchema(schemas, metadata, siteConfig) {
  const businessSchema = {
    "@type": "LocalBusiness",
    "name": metadata.title || siteConfig.businessName,
    "description": metadata.description
  };

  // Address
  if (metadata.address || siteConfig.address) {
    const address = metadata.address || siteConfig.address;
    businessSchema.address = {
      "@type": "PostalAddress",
      "streetAddress": address.streetAddress,
      "addressLocality": address.city,
      "addressRegion": address.state,
      "postalCode": address.postalCode,
      "addressCountry": address.country
    };
  }

  // Geographic coordinates
  if (metadata.latitude && metadata.longitude) {
    businessSchema.geo = {
      "@type": "GeoCoordinates",
      "latitude": metadata.latitude,
      "longitude": metadata.longitude
    };
  }

  // Contact information
  if (metadata.phone || siteConfig.phone) {
    businessSchema.telephone = metadata.phone || siteConfig.phone;
  }
  if (metadata.email || siteConfig.email) {
    businessSchema.email = metadata.email || siteConfig.email;
  }

  // Opening hours
  if (metadata.openingHours || siteConfig.openingHours) {
    businessSchema.openingHours = metadata.openingHours || siteConfig.openingHours;
  }

  // Image
  if (metadata.image) {
    businessSchema.image = metadata.image;
  }
  schemas.push(businessSchema);
}

/**
 * Generates WebPage schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} metadata - Extracted metadata
 * @param {Object} siteConfig - Site configuration
 */
function generateWebPageSchema(schemas, metadata, siteConfig) {
  const webPageSchema = {
    "@type": "WebPage",
    "name": metadata.title,
    "url": metadata.canonicalURL
  };
  if (metadata.description) {
    webPageSchema.description = metadata.description;
  }
  if (metadata.image) {
    webPageSchema.image = metadata.image;
  }

  // Part of website
  if (siteConfig.siteName) {
    webPageSchema.isPartOf = {
      "@type": "WebSite",
      "name": siteConfig.siteName,
      "url": siteConfig.hostname
    };
  }
  schemas.push(webPageSchema);
}

/**
 * Generates BreadcrumbList schema
 * @param {Array} schemas - Schemas array to modify
 * @param {string} filePath - File path
 * @param {Object} siteConfig - Site configuration
 */
function generateBreadcrumbSchema(schemas, filePath, siteConfig) {
  if (!filePath || !siteConfig.hostname) {
    return;
  }
  const pathSegments = filePath.replace(/\.html?$/, '').replace(/\/index$/, '').split('/').filter(segment => segment.length > 0);
  if (pathSegments.length === 0) {
    return;
  }
  const breadcrumbItems = [];
  let currentPath = '';

  // Add home
  breadcrumbItems.push({
    "@type": "ListItem",
    "position": 1,
    "name": "Home",
    "item": siteConfig.hostname
  });

  // Add path segments
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const name = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": index + 2,
      "name": name,
      "item": `${siteConfig.hostname}${currentPath}`
    });
  });
  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems
  };
  schemas.push(breadcrumbSchema);
}

/**
 * Generates Organization schema
 * @param {Array} schemas - Schemas array to modify
 * @param {Object} siteConfig - Site configuration
 */
function generateOrganizationSchema(schemas, siteConfig) {
  if (!siteConfig.organization) {
    return;
  }
  const org = siteConfig.organization;
  const organizationSchema = {
    "@type": "Organization",
    "name": org.name,
    "url": org.url || siteConfig.hostname
  };
  if (org.logo) {
    organizationSchema.logo = {
      "@type": "ImageObject",
      "url": org.logo
    };
  }
  if (org.description) {
    organizationSchema.description = org.description;
  }
  if (org.sameAs) {
    organizationSchema.sameAs = Array.isArray(org.sameAs) ? org.sameAs : [org.sameAs];
  }
  if (org.contactPoint) {
    organizationSchema.contactPoint = {
      "@type": "ContactPoint",
      "telephone": org.contactPoint.telephone,
      "contactType": org.contactPoint.contactType || "customer service"
    };
  }
  schemas.push(organizationSchema);
}

/**
 * Generates publisher schema for articles
 * @param {Object} organization - Organization configuration
 * @returns {Object} Publisher schema
 */
function generatePublisherSchema(organization) {
  const publisher = {
    "@type": "Organization",
    "name": organization.name
  };
  if (organization.logo) {
    publisher.logo = {
      "@type": "ImageObject",
      "url": organization.logo
    };
  }
  return publisher;
}

/**
 * Converts JSON-LD schemas to HTML script tag
 * @param {Array} schemas - Array of JSON-LD schemas
 * @returns {string} HTML script tag
 */
function generateJsonLdHtml(schemas) {
  if (schemas.length === 0) {
    return '';
  }

  // If multiple schemas, use @graph
  const jsonLd = schemas.length === 1 ? schemas[0] : {
    "@context": "https://schema.org",
    "@graph": schemas.map(schema => {
      const {
        "@context": context,
        ...rest
      } = schema;
      return rest;
    })
  };
  const jsonString = JSON.stringify(jsonLd, null, 2);
  return `<script type="application/ld+json">\n${jsonString}\n</script>`;
}

/**
 * @fileoverview HTML injection utilities for strategic head element placement.
 */

/**
 * Updates or creates the title tag
 * @param {string} html - The HTML content to modify
 * @param {string} title - The title content
 * @returns {string} Modified HTML content
 */
function updateTitle(html, title) {
  const $ = load(html, {
    decodeEntities: false,
    lowerCaseAttributeNames: false
  });
  let $head = $('head');
  if ($head.length === 0) {
    $('body').before('<head></head>');
    $head = $('head');
  }
  const $title = $head.find('title');
  if ($title.length > 0) {
    $title.text(title);
  } else {
    $head.prepend(`<title>${escapeHtml(title)}</title>`);
  }
  return $.html();
}

/**
 * Adds or updates a meta tag
 * @param {string} html - The HTML content to modify
 * @param {string} name - The meta tag name or property
 * @param {string} content - The meta tag content
 * @param {string} [type='name'] - The attribute type: 'name', 'property', 'http-equiv'
 * @returns {string} Modified HTML content
 */
function updateMetaTag(html, name, content, type = 'name') {
  const $ = load(html, {
    decodeEntities: false,
    lowerCaseAttributeNames: false
  });
  let $head = $('head');
  if ($head.length === 0) {
    $('body').before('<head></head>');
    $head = $('head');
  }

  // Find existing meta tag
  const selector = `meta[${type}="${name}"]`;
  const $existing = $head.find(selector);
  if ($existing.length > 0) {
    // Update existing meta tag
    $existing.attr('content', content);
  } else {
    // Create new meta tag
    const metaTag = `<meta ${type}="${escapeHtml(name)}" content="${escapeHtml(content)}">`;

    // Insert after existing meta tags but before other elements
    const $lastMeta = $head.find('meta').last();
    if ($lastMeta.length > 0) {
      $lastMeta.after(metaTag);
    } else {
      // Insert after title if it exists, otherwise at the start
      const $title = $head.find('title');
      if ($title.length > 0) {
        $title.after(metaTag);
      } else {
        $head.prepend(metaTag);
      }
    }
  }
  return $.html();
}

/**
 * Adds or updates a link tag
 * @param {string} html - The HTML content to modify
 * @param {string} rel - The link relationship
 * @param {string} href - The link URL
 * @param {Object} [attributes={}] - Additional attributes
 * @returns {string} Modified HTML content
 */
function updateLinkTag(html, rel, href, attributes = {}) {
  const $ = load(html, {
    decodeEntities: false,
    lowerCaseAttributeNames: false
  });
  let $head = $('head');
  if ($head.length === 0) {
    $('body').before('<head></head>');
    $head = $('head');
  }

  // Find existing link tag
  const $existing = $head.find(`link[rel="${rel}"]`);

  // Build attributes string
  const attrs = Object.entries(attributes).map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(' ');
  const linkTag = `<link rel="${escapeHtml(rel)}" href="${escapeHtml(href)}"${attrs ? ' ' + attrs : ''}>`;
  if ($existing.length > 0) {
    // Replace existing link tag
    $existing.replaceWith(linkTag);
  } else {
    // Add new link tag after other links
    const $lastLink = $head.find('link').last();
    if ($lastLink.length > 0) {
      $lastLink.after(linkTag);
    } else {
      // Insert after meta tags
      const $lastMeta = $head.find('meta').last();
      if ($lastMeta.length > 0) {
        $lastMeta.after(linkTag);
      } else {
        $head.append(linkTag);
      }
    }
  }
  return $.html();
}

/**
 * Adds a script tag to the head (for JSON-LD structured data)
 * @param {string} html - The HTML content to modify
 * @param {string} scriptContent - The script content
 * @param {string} [type='application/ld+json'] - The script type
 * @param {string} [position='end'] - Where to place the script
 * @returns {string} Modified HTML content
 */
function addScript(html, scriptContent, type = 'application/ld+json', position = 'end') {
  const $ = load(html, {
    decodeEntities: false,
    lowerCaseAttributeNames: false
  });
  let $head = $('head');
  if ($head.length === 0) {
    $('body').before('<head></head>');
    $head = $('head');
  }
  const scriptTag = `<script type="${escapeHtml(type)}">${scriptContent}</script>`;
  if (position === 'end') {
    $head.append(scriptTag);
  } else {
    $head.prepend(scriptTag);
  }
  return $.html();
}

/**
 * Escapes HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (typeof str !== 'string') {
    return String(str);
  }
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Removes existing SEO meta tags (for clean injection)
 * @param {string} html - The HTML content to modify
 * @param {string[]} [tags] - Specific tags to remove
 * @returns {string} Modified HTML content
 */
function removeExistingMetaTags(html, tags = []) {
  const $ = load(html, {
    decodeEntities: false,
    lowerCaseAttributeNames: false
  });
  const defaultTags = ['description', 'keywords', 'robots', 'canonical'];
  const ogTags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name'];
  const twitterTags = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:site', 'twitter:creator'];
  const tagsToRemove = tags.length > 0 ? tags : [...defaultTags, ...ogTags, ...twitterTags];
  tagsToRemove.forEach(tag => {
    $(`meta[name="${tag}"]`).remove();
    $(`meta[property="${tag}"]`).remove();
  });

  // Remove existing JSON-LD scripts
  $('script[type="application/ld+json"]').remove();

  // Remove existing canonical link
  $('link[rel="canonical"]').remove();
  return $.html();
}

/**
 * @fileoverview Unified head optimizer that orchestrates all SEO metadata generation.
 */

/**
 * @typedef {Object} HeadOptimizationOptions
 * @property {string} hostname - Base hostname for generating URLs
 * @property {string} [seoProperty='seo'] - Frontmatter property containing SEO data
 * @property {Object} [defaults] - Default values for missing metadata
 * @property {Object} [fallbacks] - Fallback property mappings
 * @property {Object} [social] - Social media configuration
 * @property {Object} [jsonLd] - JSON-LD configuration
 * @property {boolean} [cleanExisting=true] - Remove existing SEO tags before injection
 * @property {boolean} [generateSitemap=true] - Whether to include files in sitemap
 */

/**
 * @typedef {Object} OptimizationResult
 * @property {string} html - Modified HTML content
 * @property {Object} metadata - Extracted metadata
 * @property {Object} generated - Generated SEO content
 */

/**
 * Processes a file and optimizes its head section with SEO metadata
 * @param {string} filePath - File path relative to source
 * @param {Object} frontmatter - File frontmatter and content
 * @param {HeadOptimizationOptions} options - Optimization options
 * @returns {OptimizationResult} Optimization result
 */
async function optimizeHead(filePath, frontmatter, options) {
  const {
    hostname,
    seoProperty = 'seo',
    defaults = {},
    fallbacks = {},
    social = {},
    jsonLd = {},
    cleanExisting = true,
    generateSitemap = true
  } = options;

  // Skip non-HTML files
  if (!isHtmlFile(filePath) || !Buffer.isBuffer(frontmatter.contents)) {
    return {
      html: frontmatter.contents.toString(),
      metadata: null,
      generated: null
    };
  }

  // Extract unified metadata
  const metadata = extractMetadata(filePath, frontmatter, {
    hostname,
    seoProperty,
    defaults,
    fallbacks
  });

  // Check if file should be excluded from SEO processing
  if (metadata.noIndex && !generateSitemap) {
    return {
      html: frontmatter.contents.toString(),
      metadata,
      generated: null
    };
  }

  // Generate all SEO content
  const generated = await generateAllSeoContent(metadata, {
    hostname,
    social,
    jsonLd,
    filePath
  });

  // Inject SEO content into HTML
  let html = frontmatter.contents.toString();
  html = await injectSeoContent(html, metadata, generated, {
    cleanExisting
  });
  return {
    html,
    metadata,
    generated
  };
}

/**
 * Generates all SEO content from metadata
 * @param {Object} metadata - Extracted metadata
 * @param {Object} config - Generation configuration
 * @returns {Object} Generated SEO content
 */
async function generateAllSeoContent(metadata, config) {
  const {
    hostname,
    social,
    jsonLd,
    filePath
  } = config;

  // Site configuration combining hostname with social/jsonLd configs
  const siteConfig = {
    hostname,
    ...social,
    ...jsonLd
  };

  // Generate meta tags
  const metaResult = generateMetaTags(metadata, siteConfig);

  // Generate Open Graph tags
  const ogResult = generateOpenGraphTags(metadata, siteConfig);

  // Generate Twitter Card tags
  const twitterResult = generateTwitterCardTags(metadata, siteConfig);

  // Generate JSON-LD structured data
  const jsonLdResult = generateJsonLd(metadata, siteConfig, filePath);
  return {
    meta: metaResult,
    openGraph: ogResult,
    twitter: twitterResult,
    jsonLd: jsonLdResult
  };
}

/**
 * Injects SEO content into HTML head section
 * @param {string} html - Original HTML content
 * @param {Object} metadata - Extracted metadata
 * @param {Object} generated - Generated SEO content
 * @param {Object} options - Injection options
 * @returns {string} Modified HTML content
 */
async function injectSeoContent(html, metadata, generated, options = {}) {
  const {
    cleanExisting = true
  } = options;
  let modifiedHtml = html;

  // Clean existing SEO tags if requested
  if (cleanExisting) {
    modifiedHtml = removeExistingMetaTags(modifiedHtml);
  }

  // Update title tag
  if (metadata.title) {
    modifiedHtml = updateTitle(modifiedHtml, metadata.title);
  }

  // Inject meta tags (critical tags first)
  const criticalMetaTags = getCriticalMetaTags(generated.meta.metaTags);
  const otherMetaTags = getOtherMetaTags(generated.meta.metaTags);

  // Inject critical meta tags early
  for (const tag of criticalMetaTags) {
    if (tag.name) {
      modifiedHtml = updateMetaTag(modifiedHtml, tag.name, tag.content, 'name');
    } else if (tag.httpEquiv) {
      modifiedHtml = updateMetaTag(modifiedHtml, tag.httpEquiv, tag.content, 'http-equiv');
    }
  }

  // Inject link tags (after critical meta tags)
  for (const link of generated.meta.linkTags) {
    modifiedHtml = updateLinkTag(modifiedHtml, link.rel, link.href, Object.fromEntries(Object.entries(link).filter(([key]) => !['rel', 'href'].includes(key))));
  }

  // Inject remaining meta tags
  for (const tag of otherMetaTags) {
    if (tag.name) {
      modifiedHtml = updateMetaTag(modifiedHtml, tag.name, tag.content, 'name');
    }
  }

  // Inject Open Graph tags
  for (const tag of generated.openGraph.metaTags) {
    modifiedHtml = updateMetaTag(modifiedHtml, tag.property, tag.content, 'property');
  }

  // Inject Twitter Card tags
  for (const tag of generated.twitter.metaTags) {
    modifiedHtml = updateMetaTag(modifiedHtml, tag.name, tag.content, 'name');
  }

  // Inject JSON-LD structured data (at the end for optimal loading)
  if (generated.jsonLd.html) {
    const jsonLdContent = generated.jsonLd.html.replace(/<script[^>]*>|<\/script>/g, '');
    modifiedHtml = addScript(modifiedHtml, jsonLdContent, 'application/ld+json', 'end');
  }
  return modifiedHtml;
}

/**
 * Determines critical meta tags that should be injected early
 * @param {Array} metaTags - All meta tags
 * @returns {Array} Critical meta tags
 */
function getCriticalMetaTags(metaTags) {
  const criticalTags = ['viewport', 'charset', 'description', 'robots'];
  return metaTags.filter(tag => criticalTags.includes(tag.name) || criticalTags.includes(tag.httpEquiv));
}

/**
 * Gets non-critical meta tags
 * @param {Array} metaTags - All meta tags
 * @returns {Array} Non-critical meta tags
 */
function getOtherMetaTags(metaTags) {
  const criticalTags = ['viewport', 'charset', 'description', 'robots'];
  return metaTags.filter(tag => !criticalTags.includes(tag.name) && !criticalTags.includes(tag.httpEquiv));
}

/**
 * Checks if a file is an HTML file that should be processed
 * @param {string} filePath - File path
 * @returns {boolean} Whether file should be processed
 */
function isHtmlFile(filePath) {
  return /\.html?$/i.test(filePath);
}

/**
 * Batch processes multiple files for SEO optimization
 * @param {Object} files - Metalsmith files object
 * @param {HeadOptimizationOptions} options - Optimization options
 * @returns {Promise<Object>} Results for each processed file
 */
async function batchOptimizeHeads(files, options) {
  const results = {};
  const fileList = Object.keys(files);

  // Process files in parallel batches
  const batchSize = options.batchSize || 10;
  for (let i = 0; i < fileList.length; i += batchSize) {
    const batch = fileList.slice(i, i + batchSize);
    const batchPromises = batch.map(async filePath => {
      try {
        const result = await optimizeHead(filePath, files[filePath], options);

        // Update file contents if HTML was modified
        if (result.html !== files[filePath].contents.toString()) {
          files[filePath].contents = Buffer.from(result.html);
        }

        // Store metadata for potential use by other plugins
        if (result.metadata) {
          files[filePath].seoMetadata = result.metadata;
        }
        return {
          filePath,
          result
        };
      } catch (error) {
        console.error(`SEO optimization failed for ${filePath}:`, error);
        return {
          filePath,
          error
        };
      }
    });
    const batchResults = await Promise.all(batchPromises);

    // Collect results
    batchResults.forEach(({
      filePath,
      result,
      error
    }) => {
      results[filePath] = error ? {
        error
      } : result;
    });
  }
  return results;
}

/**
 * @fileoverview URL building and validation utilities for sitemap generation.
 */

/**
 * Determines whether a file should be included in the sitemap.
 * Files are included if they match the pattern and are not marked as private.
 * @param {string} file - File path relative to source directory
 * @param {Object} frontmatter - File metadata and frontmatter
 * @param {Object} metalsmith - Metalsmith instance
 * @param {string} pattern - Glob pattern to match files
 * @param {string} privateProperty - Property name to check if file should be excluded
 * @returns {boolean} True if file should be processed, false otherwise
 */
function checkFile(file, frontmatter, metalsmith, pattern, privateProperty) {
  // Only process files that match the pattern
  const matchResult = metalsmith.match(pattern, file);
  if (!matchResult || matchResult.length === 0) {
    return false;
  }

  // Don't process private files
  if (get(frontmatter, privateProperty)) {
    return false;
  }
  return true;
}

/**
 * Constructs the final URL for a file based on configuration options.
 * Handles canonical URL overrides, index file omission, and extension removal.
 * @param {string} file - File path relative to source directory
 * @param {Object} frontmatter - File metadata and frontmatter
 * @param {Object} options - URL building options
 * @param {string} options.urlProperty - Property name to read canonical URL from file metadata
 * @param {boolean} options.omitIndex - Whether to omit index.html from URLs
 * @param {boolean} options.omitExtension - Whether to omit file extensions from URLs
 * @returns {string} Final URL for the sitemap entry
 */
function buildUrl(file, frontmatter, options) {
  const {
    urlProperty,
    omitIndex,
    omitExtension
  } = options;

  // Frontmatter settings take precedence
  const canonicalUrl = get(frontmatter, urlProperty);
  if (typeof canonicalUrl === "string") {
    return canonicalUrl;
  }

  // Remove index.html if necessary
  const indexFile = "index.html";
  if (omitIndex && path.basename(file) === indexFile) {
    return replaceBackslash(file.slice(0, 0 - indexFile.length));
  }

  // Remove extension if necessary
  if (omitExtension) {
    return replaceBackslash(file.slice(0, 0 - path.extname(file).length));
  }

  // Otherwise just use 'file'
  return replaceBackslash(file);
}

/**
 * Normalizes file paths by replacing backslashes with forward slashes.
 * Ensures cross-platform compatibility for URLs.
 * @param {string} url - File path that may contain backslashes
 * @returns {string} Normalized path with forward slashes
 */
function replaceBackslash(url) {
  return url.replace(/\\/g, "/");
}

/**
 * @fileoverview Automatic priority and changefreq calculation utilities.
 */

/**
 * Calculates automatic priority based on content analysis.
 * @param {string} file - File path relative to source directory
 * @param {Object} frontmatter - File metadata and frontmatter
 * @param {Object} options - Calculation options
 * @param {string} options.modifiedProperty - Property name to read last modified date from file metadata
 * @param {Date|string} options.lastmod - Default last modified date
 * @returns {number} Calculated priority between 0.1 and 1.0
 */
function calculatePriority(file, frontmatter, options) {
  const {
    modifiedProperty,
    lastmod
  } = options;
  let calculatedPriority = 0.5; // Base priority

  // Path depth analysis (shallower = higher priority)
  const pathDepth = file.split(path.sep).length;
  if (pathDepth === 1) {
    calculatedPriority += 0.3; // Root level files
  } else if (pathDepth === 2) {
    calculatedPriority += 0.2; // One level deep
  } else if (pathDepth === 3) {
    calculatedPriority += 0.1; // Two levels deep
  }
  // Deeper files keep base priority

  // Content type analysis based on path patterns
  const lowerFile = file.toLowerCase();
  if (lowerFile.includes('/blog/') || lowerFile.includes('/news/') || lowerFile.includes('/articles/')) {
    calculatedPriority += 0.1; // Blog content gets boost
  }
  if (lowerFile.includes('/services/') || lowerFile.includes('/products/')) {
    calculatedPriority += 0.2; // Service/product pages get higher boost
  }
  if (lowerFile.includes('index.html') && pathDepth <= 2) {
    calculatedPriority += 0.2; // Index pages are important
  }
  if (lowerFile.includes('/about') || lowerFile.includes('/contact')) {
    calculatedPriority += 0.15; // About/contact pages
  }

  // Content age analysis (if lastmod is available)
  const fileLastmod = get(frontmatter, modifiedProperty) || lastmod;
  if (fileLastmod) {
    const modDate = fileLastmod instanceof Date ? fileLastmod : new Date(fileLastmod);
    const now = new Date();
    const daysSinceModified = (now - modDate) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 30) {
      calculatedPriority += 0.1; // Recently modified content
    } else if (daysSinceModified < 90) {
      calculatedPriority += 0.05; // Moderately recent content
    }
    // Older content gets no bonus
  }

  // Content length analysis (if contents available)
  if (Buffer.isBuffer(frontmatter.contents)) {
    const contentLength = frontmatter.contents.length;
    if (contentLength > 5000) {
      calculatedPriority += 0.05; // Substantial content gets small boost
    }
  }

  // Ensure priority stays within valid range
  return Math.min(Math.max(calculatedPriority, 0.1), 1.0);
}

/**
 * Calculates automatic change frequency based on content analysis.
 * @param {string} file - File path relative to source directory
 * @param {Object} frontmatter - File metadata and frontmatter
 * @param {Object} options - Calculation options
 * @param {string} options.modifiedProperty - Property name to read last modified date from file metadata
 * @param {Date|string} options.lastmod - Default last modified date
 * @returns {string} Calculated change frequency
 */
function calculateChangefreq(file, frontmatter, options) {
  const {
    modifiedProperty,
    lastmod
  } = options;
  const lowerFile = file.toLowerCase();

  // Blog and news content changes frequently
  if (lowerFile.includes('/blog/') || lowerFile.includes('/news/') || lowerFile.includes('/articles/')) {
    return 'weekly';
  }

  // Index pages and category pages update when new content is added
  if (lowerFile.includes('index.html')) {
    if (lowerFile.includes('/blog/') || lowerFile.includes('/news/')) {
      return 'weekly'; // Blog index updates frequently
    }
    return 'monthly'; // Other index pages update less frequently
  }

  // Service and product pages update occasionally
  if (lowerFile.includes('/services/') || lowerFile.includes('/products/')) {
    return 'monthly';
  }

  // About, contact, and policy pages rarely change
  if (lowerFile.includes('/about') || lowerFile.includes('/contact') || lowerFile.includes('/privacy') || lowerFile.includes('/terms')) {
    return 'yearly';
  }

  // Documentation might update occasionally
  if (lowerFile.includes('/docs/') || lowerFile.includes('/documentation/')) {
    return 'monthly';
  }

  // Check content age if available
  const fileLastmod = get(frontmatter, modifiedProperty) || lastmod;
  if (fileLastmod) {
    const modDate = fileLastmod instanceof Date ? fileLastmod : new Date(fileLastmod);
    const now = new Date();
    const daysSinceModified = (now - modDate) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 7) {
      return 'weekly'; // Recently modified
    } else if (daysSinceModified < 30) {
      return 'monthly'; // Modified in last month
    } else if (daysSinceModified < 365) {
      return 'yearly'; // Modified in last year
    }
  }

  // Default for unclassified content
  return 'monthly';
}

/**
 * @fileoverview Sitemap processor for generating sitemap.xml files.
 */

/**
 * @typedef {Object} SitemapOptions
 * @property {string} hostname - Base hostname for all URLs in the sitemap
 * @property {Date|string} [lastmod] - Default last modified date for all files
 * @property {string} [links] - Property name to read additional links from file metadata
 * @property {'always'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'|'never'} [changefreq] - Default change frequency
 * @property {boolean} [omitExtension] - Whether to omit file extensions from URLs
 * @property {boolean} [omitIndex] - Whether to omit index.html from URLs
 * @property {string} [output='sitemap.xml'] - Output filename for the sitemap
 * @property {string} [pattern] - Glob pattern to match files for inclusion (default: all HTML files)
 * @property {string|number} [priority] - Default priority for all URLs (0.0 to 1.0)
 * @property {string} [urlProperty='canonical'] - Property name to read canonical URL from file metadata
 * @property {string} [modifiedProperty='lastmod'] - Property name to read last modified date from file metadata
 * @property {string} [privateProperty='private'] - Property name to check if file should be excluded
 * @property {string} [priorityProperty='priority'] - Property name to read priority from file metadata
 * @property {boolean} [auto=false] - Enable automatic priority and changefreq calculation based on content analysis
 */

/**
 * Processes files and generates sitemap.xml
 * @param {Object} files - Metalsmith files object
 * @param {Object} metalsmith - Metalsmith instance
 * @param {SitemapOptions} options - Sitemap configuration options
 * @returns {Promise<void>}
 */
async function processSitemap(files, metalsmith, options) {
  const {
    auto = false,
    changefreq,
    hostname,
    lastmod,
    links: linksOption,
    omitExtension,
    omitIndex,
    output = "sitemap.xml",
    pattern = "**/*.html",
    priority,
    urlProperty = "canonical",
    modifiedProperty = "lastmod",
    privateProperty = "private",
    priorityProperty = "priority"
  } = options;
  const links = [];

  // Custom sorting to ensure consistent output order
  // Files in root directory come first, then subdirectories
  const sortedFiles = Object.keys(files).sort((a, b) => {
    const aDepth = a.split(path.sep).length;
    const bDepth = b.split(path.sep).length;
    if (aDepth !== bDepth) {
      return aDepth - bDepth; // Shallower paths first
    }
    return a.localeCompare(b); // Alphabetical within same depth
  });
  sortedFiles.forEach(function (file) {
    // Get the current file's frontmatter
    const frontmatter = files[file];

    // Validate file.contents is a Buffer before processing
    if (!Buffer.isBuffer(frontmatter.contents)) {
      return;
    }

    // Only process files that pass the check
    if (!checkFile(file, frontmatter, metalsmith, pattern, privateProperty)) {
      return;
    }

    // Get lastmod value and format it properly
    let lastmodValue = get(frontmatter, modifiedProperty) || lastmod;
    if (lastmodValue instanceof Date) {
      // Format date as YYYY-MM-DD to match old library behavior
      lastmodValue = lastmodValue.toISOString().split("T")[0];
    } else if (typeof lastmodValue === "string" && lastmodValue.includes("T")) {
      // Handle ISO string dates by extracting just the date part
      lastmodValue = lastmodValue.split("T")[0];
    }

    // Create the sitemap entry (reject keys with falsy values)
    let entryChangefreq, entryPriority;
    if (auto) {
      // Auto mode: calculate values, ignore global and frontmatter settings
      entryChangefreq = calculateChangefreq(file, frontmatter, {
        modifiedProperty,
        lastmod
      });
      entryPriority = calculatePriority(file, frontmatter, {
        modifiedProperty,
        lastmod
      });
    } else {
      // Manual mode: use global defaults, allow frontmatter overrides
      entryChangefreq = frontmatter.changefreq || changefreq;
      entryPriority = get(frontmatter, priorityProperty) || priority;
    }
    const entry = pick({
      changefreq: entryChangefreq,
      priority: entryPriority,
      lastmod: lastmodValue,
      links: linksOption ? get(frontmatter, linksOption) : undefined
    }, identity);

    // Add the url (which is allowed to be falsy)
    entry.url = buildUrl(file, frontmatter, {
      urlProperty,
      omitIndex,
      omitExtension
    });

    // Add the entry to the links array
    links.push(entry);
  });

  // Generate sitemap using the new sitemap library API
  try {
    const sitemap = new SitemapStream({
      hostname,
      xmlns: {
        news: false,
        xhtml: false,
        image: false,
        video: false
      }
    });

    // Write all URLs to the stream
    links.forEach(link => sitemap.write(link));

    // End the stream
    sitemap.end();

    // Convert stream to string
    const sitemapContent = await streamToPromise(sitemap);

    // Add the sitemap file to the files object
    files[output] = {
      contents: sitemapContent
    };
  } catch (error) {
    throw new Error(`Failed to generate sitemap: ${error.message}`);
  }
}

/**
 * @fileoverview Robots.txt generation and coordination for Metalsmith SEO
 * Handles existing robots.txt files intelligently and generates basic ones when needed
 */

/**
 * @typedef {Object} RobotsOptions
 * @property {string} hostname - Base hostname for sitemap URL
 * @property {string} [sitemapFile='sitemap.xml'] - Name of the sitemap file to reference
 * @property {boolean} [generateRobots=true] - Whether to generate robots.txt if none exists
 * @property {boolean} [addSitemapReference=true] - Whether to add sitemap reference to existing robots.txt
 * @property {Array<string>} [disallowPaths=[]] - Additional paths to disallow
 * @property {string} [userAgent='*'] - User agent for robots directives
 */

/**
 * Processes robots.txt file - generates if missing, updates if needed
 * @param {Object} files - Metalsmith files object
 * @param {Object} metalsmith - Metalsmith instance
 * @param {RobotsOptions} options - Configuration options
 * @returns {Promise<void>}
 */
async function processRobots(files, metalsmith, options) {
  const {
    hostname,
    sitemapFile = 'sitemap.xml',
    generateRobots = true,
    addSitemapReference = true,
    disallowPaths = [],
    userAgent = '*'
  } = options;
  const robotsFile = 'robots.txt';
  const existingRobots = files[robotsFile];
  // Ensure hostname is a string
  const hostnameStr = String(hostname || '');
  const sitemapUrl = `${hostnameStr.replace(/\/$/, '')}/${sitemapFile}`;
  if (existingRobots) {
    // Handle existing robots.txt file
    if (addSitemapReference) {
      const content = existingRobots.contents.toString();

      // Check if sitemap is already referenced
      if (!content.includes('Sitemap:') && !content.includes('sitemap:')) {
        // Add sitemap reference
        const updatedContent = content.trim() + `\n\nSitemap: ${sitemapUrl}\n`;
        existingRobots.contents = Buffer.from(updatedContent);

        // Only log in non-test environments
        const isTest = process.env.NODE_ENV === 'test' || process.env.METALSMITH_ENV === 'test';
        if (!isTest) {
          console.log('[metalsmith-seo] Added sitemap reference to existing robots.txt');
        }
      }
    }
  } else if (generateRobots) {
    // Generate basic robots.txt file
    const robotsContent = generateBasicRobots({
      userAgent,
      disallowPaths,
      sitemapUrl
    });
    files[robotsFile] = {
      contents: Buffer.from(robotsContent),
      mode: '0644'
    };

    // Only log in non-test environments
    const isTest = process.env.NODE_ENV === 'test' || process.env.METALSMITH_ENV === 'test';
    if (!isTest) {
      console.log('[metalsmith-seo] Generated robots.txt with sitemap reference');
    }
  }
}

/**
 * Generates basic robots.txt content
 * @param {Object} options - Generation options
 * @param {string} options.userAgent - User agent directive
 * @param {Array<string>} options.disallowPaths - Paths to disallow
 * @param {string} options.sitemapUrl - Full URL to sitemap
 * @returns {string} Robots.txt content
 */
function generateBasicRobots({
  userAgent,
  disallowPaths,
  sitemapUrl
}) {
  const lines = [];

  // User agent directive
  lines.push(`User-agent: ${userAgent}`);

  // Disallow directives
  if (disallowPaths.length > 0) {
    disallowPaths.forEach(path => {
      lines.push(`Disallow: ${path}`);
    });
  } else {
    // Default: allow all
    lines.push('Disallow:');
  }

  // Empty line before sitemap
  lines.push('');

  // Sitemap reference
  lines.push(`Sitemap: ${sitemapUrl}`);
  return lines.join('\n') + '\n';
}

/**
 * @fileoverview Comprehensive Metalsmith SEO plugin with head optimization, social media tags, and structured data.
 * @author Werner Glinka
 */

/**
 * Cache for site metadata checks to avoid repeated expensive operations
 * @type {Object}
 */
let siteMetadataCache = null;

/**
 * Get nested property from an object using dot notation path
 * @param {Object} obj - The object to query
 * @param {string} path - The path to the property (e.g., 'site' or 'data.site')
 * @returns {*} The value at the path, or undefined if not found
 */
function getNestedProperty(obj, path) {
  if (!path || !obj) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/**
 * @typedef {Object} SeoOptions
 * @property {string} hostname - Base hostname for all URLs
 * @property {string} [seoProperty='seo'] - Frontmatter property containing SEO data
 * @property {string} [metadataPath='site'] - Path to site metadata in metalsmith.metadata() (e.g., 'site' or 'data.site')
 * @property {Object} [defaults] - Default values for missing metadata
 * @property {Object} [fallbacks] - Fallback property mappings
 * @property {Object} [social] - Social media configuration
 * @property {Object} [jsonLd] - JSON-LD structured data configuration
 * @property {Object} [sitemap] - Sitemap generation options
 * @property {Object} [robots] - Robots.txt generation options
 * @property {boolean} [enableSitemap=true] - Whether to generate sitemap.xml
 * @property {boolean} [enableRobots=true] - Whether to generate/update robots.txt
 * @property {number} [batchSize=10] - Number of files to process in parallel
 */

/**
 * @typedef {Object} SocialConfig
 * @property {string} [siteName] - Site name for Open Graph
 * @property {string} [locale='en_US'] - Default locale
 * @property {string} [twitterSite] - Twitter site handle (@username)
 * @property {string} [twitterCreator] - Default Twitter creator handle
 * @property {string} [facebookAppId] - Facebook App ID
 * @property {string|Array<string>} [facebookAdmins] - Facebook admin IDs
 */

/**
 * @typedef {Object} JsonLdConfig
 * @property {Object} [organization] - Organization schema data
 * @property {string} [searchUrl] - Search URL for WebSite schema
 * @property {Array<string>} [enableSchemas] - Schemas to auto-generate
 */

/**
 * @typedef {Object} SitemapConfig
 * @property {string} [output='sitemap.xml'] - Sitemap output filename
 * @property {string} [pattern] - File pattern for sitemap inclusion (default: all HTML files)
 * @property {boolean} [omitIndex=false] - Omit index.html from URLs
 * @property {boolean} [omitExtension=false] - Omit file extensions
 * @property {boolean} [auto=false] - Auto-calculate priority and changefreq
 */

/**
 * @typedef {Object} RobotsConfig
 * @property {boolean} [generateRobots=true] - Generate robots.txt if none exists
 * @property {boolean} [addSitemapReference=true] - Add sitemap reference to existing robots.txt
 * @property {Array<string>} [disallowPaths=[]] - Additional paths to disallow
 * @property {string} [userAgent='*'] - User agent for robots directives
 */

/**
 * @typedef {Object} MetalsmithFiles
 * @description Object containing all files in the Metalsmith build, keyed by file path
 * @type {Object<string, {contents: Buffer} & FileMetadata>}
 */

/**
 * @typedef {Object} MetalsmithInstance
 * @property {function(string, string): string[]} match - Match files against a glob pattern
 * @property {function} [metadata] - Get/set global metadata
 * @property {function} [source] - Get/set source directory
 * @property {function} [destination] - Get/set destination directory
 */

/**
 * @typedef {function(Error=): void} MetalsmithCallback
 * @description Callback function to signal completion of plugin processing
 */

/**
 * @typedef {function(MetalsmithFiles, MetalsmithInstance, MetalsmithCallback): void} MetalsmithPlugin
 * @description Function signature for Metalsmith plugins
 */

/**
 * @typedef {string|SeoOptions} Options
 * @description Plugin configuration - can be a hostname string or full options object
 */

/**
 * Creates a comprehensive Metalsmith SEO plugin.
 *
 * This plugin provides unified SEO optimization including:
 * - HTML head optimization with meta tags
 * - Open Graph tags for social media sharing
 * - Twitter Card tags
 * - JSON-LD structured data
 * - Sitemap.xml generation
 *
 * @param {Options} options - Plugin configuration options
 *   When passed as a string, it will be treated as the hostname.
 *   When passed as an object, it supports the full configuration.
 * @returns {import('metalsmith').Plugin} Configured plugin function
 * @throws {Error} When hostname is not provided or configuration is invalid
 *
 * @example
 * // Simple usage with hostname only
 * metalsmith.use(seo('https://example.com'))
 *
 * @example
 * // Using site metadata from data.site instead of site
 * metalsmith.use(seo({
 *   metadataPath: 'data.site'  // Will look for metadata().data.site.url, etc.
 * }))
 *
 * @example
 * // Advanced configuration
 * metalsmith.use(seo({
 *   hostname: 'https://example.com',
 *   defaults: {
 *     title: 'My Site',
 *     description: 'Default description',
 *     socialImage: '/images/default-og.jpg'
 *   },
 *   social: {
 *     siteName: 'My Site',
 *     twitterSite: '@mysite'
 *   },
 *   jsonLd: {
 *     organization: {
 *       name: 'My Company',
 *       logo: 'https://example.com/logo.png'
 *     }
 *   }
 * }))
 */
function plugin(options = {}) {
  let opts = options;

  // Accept string option to specify the hostname
  if (typeof opts === "string") {
    opts = {
      hostname: opts
    };
  }

  // We'll merge with site metadata inside the plugin function
  const pluginOptions = opts;

  /**
   * Main plugin function that processes files for comprehensive SEO optimization.
   * @param {MetalsmithFiles} files - Object containing all files in the build
   * @param {MetalsmithInstance} metalsmith - Metalsmith instance for accessing utilities
   * @param {MetalsmithCallback} done - Callback to signal completion
   * @returns {void}
   */
  return function (files, metalsmith, done) {
    var _pluginOptions$defaul2, _pluginOptions$defaul3, _pluginOptions$defaul4, _pluginOptions$social, _pluginOptions$social2, _pluginOptions$social3, _pluginOptions$social4, _pluginOptions$jsonLd;
    // Get the metadata path (default to 'site')
    const metadataPath = pluginOptions.metadataPath || 'site';

    // Use cached site metadata check if available
    let siteMetadata, hasSiteMetadata, deducedSiteName, deducedDescription;
    if (siteMetadataCache !== null) {
      // Use cached values
      siteMetadata = siteMetadataCache.siteMetadata;
      hasSiteMetadata = siteMetadataCache.hasSiteMetadata;
      deducedSiteName = siteMetadataCache.deducedSiteName;
      deducedDescription = siteMetadataCache.deducedDescription;
    } else {
      var _pluginOptions$defaul;
      // First run - check and cache
      // Try to get site metadata from the configured path
      siteMetadata = getNestedProperty(metalsmith.metadata(), metadataPath) || {};
      hasSiteMetadata = Object.keys(siteMetadata).length > 0;
      deducedSiteName = null;
      deducedDescription = null;
      if (!hasSiteMetadata && !((_pluginOptions$defaul = pluginOptions.defaults) != null && _pluginOptions$defaul.title)) {
        // Try to deduce site name from index file
        const indexFile = files['index.html'] || files['index.md'];
        if (indexFile && indexFile.title) {
          deducedSiteName = indexFile.title;
        }
      }

      // Cache the results
      siteMetadataCache = {
        siteMetadata,
        hasSiteMetadata,
        deducedSiteName,
        deducedDescription,
        hasLoggedConfigSource: false
      };
    }

    // Merge configurations: deduced < site defaults < plugin options
    const config = {
      // Site-wide defaults from site.json or deduced
      hostname: siteMetadata.url || pluginOptions.hostname,
      defaults: {
        title: ((_pluginOptions$defaul2 = pluginOptions.defaults) == null ? void 0 : _pluginOptions$defaul2.title) || siteMetadata.title || deducedSiteName,
        description: ((_pluginOptions$defaul3 = pluginOptions.defaults) == null ? void 0 : _pluginOptions$defaul3.description) || siteMetadata.description || deducedDescription,
        socialImage: ((_pluginOptions$defaul4 = pluginOptions.defaults) == null ? void 0 : _pluginOptions$defaul4.socialImage) || siteMetadata.socialImage || siteMetadata.defaultImage,
        ...(pluginOptions.defaults || {})
      },
      social: {
        siteName: ((_pluginOptions$social = pluginOptions.social) == null ? void 0 : _pluginOptions$social.siteName) || siteMetadata.name || siteMetadata.title || deducedSiteName,
        locale: ((_pluginOptions$social2 = pluginOptions.social) == null ? void 0 : _pluginOptions$social2.locale) || siteMetadata.locale || 'en_US',
        twitterSite: ((_pluginOptions$social3 = pluginOptions.social) == null ? void 0 : _pluginOptions$social3.twitterSite) || siteMetadata.twitter,
        facebookAppId: ((_pluginOptions$social4 = pluginOptions.social) == null ? void 0 : _pluginOptions$social4.facebookAppId) || siteMetadata.facebookAppId,
        ...(siteMetadata.social || {}),
        ...(pluginOptions.social || {})
      },
      jsonLd: {
        organization: ((_pluginOptions$jsonLd = pluginOptions.jsonLd) == null ? void 0 : _pluginOptions$jsonLd.organization) || siteMetadata.organization,
        ...(siteMetadata.jsonLd || {}),
        ...(pluginOptions.jsonLd || {})
      },
      // Plugin-specific options (not typically in site.json)
      seoProperty: pluginOptions.seoProperty || 'seo',
      enableSitemap: pluginOptions.enableSitemap !== undefined ? pluginOptions.enableSitemap : true,
      enableRobots: pluginOptions.enableRobots !== undefined ? pluginOptions.enableRobots : true,
      batchSize: pluginOptions.batchSize || 10,
      // Fallback mappings
      fallbacks: pluginOptions.fallbacks || {
        title: 'title',
        description: 'excerpt',
        image: 'featured_image',
        author: 'author'
      },
      // Sitemap configuration
      sitemap: {
        ...(siteMetadata.sitemap || {}),
        ...(pluginOptions.sitemap || {})
      },
      // Robots.txt configuration
      robots: {
        ...(siteMetadata.robots || {}),
        ...(pluginOptions.robots || {})
      }
    };

    // Add legacy sitemap options for compatibility (but don't override hostname!)
    // Only copy specific legacy options, not everything
    if (pluginOptions.changefreq !== undefined) config.changefreq = pluginOptions.changefreq;
    if (pluginOptions.priority !== undefined) config.priority = pluginOptions.priority;
    if (pluginOptions.lastmod !== undefined) config.lastmod = pluginOptions.lastmod;
    if (pluginOptions.links !== undefined) config.links = pluginOptions.links;
    if (pluginOptions.urlProperty !== undefined) config.urlProperty = pluginOptions.urlProperty;
    if (pluginOptions.modifiedProperty !== undefined) config.modifiedProperty = pluginOptions.modifiedProperty;
    if (pluginOptions.privateProperty !== undefined) config.privateProperty = pluginOptions.privateProperty;
    if (pluginOptions.priorityProperty !== undefined) config.priorityProperty = pluginOptions.priorityProperty;
    if (pluginOptions.output !== undefined) config.output = pluginOptions.output;
    if (pluginOptions.pattern !== undefined) config.pattern = pluginOptions.pattern;
    if (pluginOptions.omitIndex !== undefined) config.omitIndex = pluginOptions.omitIndex;
    if (pluginOptions.omitExtension !== undefined) config.omitExtension = pluginOptions.omitExtension;
    if (pluginOptions.auto !== undefined) config.auto = pluginOptions.auto;

    // Validate configuration
    if (!config.hostname) {
      const metadataHint = metadataPath === 'site' ? 'site.url' : `${metadataPath}.url`;
      throw new Error(`[metalsmith-seo] hostname is required (set in plugin options or ${metadataHint} in metadata)`);
    }

    // Provide helpful feedback about configuration source (only once and not in test environment)
    const isTest = process.env.NODE_ENV === 'test' || process.env.METALSMITH_ENV === 'test';
    if (!isTest && siteMetadataCache && !siteMetadataCache.hasLoggedConfigSource) {
      if (!hasSiteMetadata) {
        console.log('[metalsmith-seo] No site metadata found. Using plugin defaults.');
        if (deducedSiteName) {
          console.log(`[metalsmith-seo] Deduced site name from index: "${deducedSiteName}"`);
        }
        console.log('[metalsmith-seo] Tip: Add a site.json to data/ folder for better SEO defaults.');
      } else {
        var _pluginOptions$defaul5, _pluginOptions$defaul6;
        // Only log if we're using site metadata values
        const usingSiteValues = [];
        if (siteMetadata.url && !pluginOptions.hostname) usingSiteValues.push('hostname');
        if (siteMetadata.title && !((_pluginOptions$defaul5 = pluginOptions.defaults) != null && _pluginOptions$defaul5.title)) usingSiteValues.push('title');
        if (siteMetadata.description && !((_pluginOptions$defaul6 = pluginOptions.defaults) != null && _pluginOptions$defaul6.description)) usingSiteValues.push('description');
        if (usingSiteValues.length > 0) {
          console.log(`[metalsmith-seo] Using site.json for: ${usingSiteValues.join(', ')}`);
        }
      }

      // Mark that we've logged the config source
      siteMetadataCache.hasLoggedConfigSource = true;
    }

    // Always optimize heads - that's the point of an SEO plugin!
    const headOptimization = batchOptimizeHeads(files, {
      hostname: config.hostname,
      seoProperty: config.seoProperty,
      defaults: config.defaults,
      fallbacks: config.fallbacks,
      social: config.social,
      jsonLd: config.jsonLd,
      batchSize: config.batchSize
    });

    // Sitemap generation (if enabled)
    let sitemapGeneration = Promise.resolve();
    if (config.enableSitemap) {
      var _config$sitemap, _config$sitemap2, _config$sitemap3, _config$sitemap4, _config$sitemap5;
      // Merge sitemap-specific options
      const sitemapOptions = {
        hostname: config.hostname,
        output: ((_config$sitemap = config.sitemap) == null ? void 0 : _config$sitemap.output) || config.output || 'sitemap.xml',
        pattern: ((_config$sitemap2 = config.sitemap) == null ? void 0 : _config$sitemap2.pattern) || config.pattern || '**/*.html',
        omitIndex: ((_config$sitemap3 = config.sitemap) == null ? void 0 : _config$sitemap3.omitIndex) !== undefined ? config.sitemap.omitIndex : config.omitIndex || false,
        omitExtension: ((_config$sitemap4 = config.sitemap) == null ? void 0 : _config$sitemap4.omitExtension) !== undefined ? config.sitemap.omitExtension : config.omitExtension || false,
        auto: ((_config$sitemap5 = config.sitemap) == null ? void 0 : _config$sitemap5.auto) !== undefined ? config.sitemap.auto : config.auto !== undefined ? config.auto : true,
        // Legacy options support
        changefreq: config.changefreq,
        priority: config.priority,
        lastmod: config.lastmod,
        links: config.links,
        urlProperty: config.urlProperty || 'canonical',
        modifiedProperty: config.modifiedProperty || 'lastmod',
        privateProperty: config.privateProperty || 'private',
        priorityProperty: config.priorityProperty || 'priority'
      };
      sitemapGeneration = processSitemap(files, metalsmith, sitemapOptions);
    }

    // Execute head optimization and sitemap in parallel
    Promise.all([headOptimization, sitemapGeneration]).then(() => {
      // Robots.txt generation/update (if enabled) - after sitemap is done
      if (config.enableRobots) {
        var _config$sitemap6, _config$robots, _config$robots2, _config$robots3, _config$robots4;
        const robotsOptions = {
          hostname: config.hostname,
          sitemapFile: ((_config$sitemap6 = config.sitemap) == null ? void 0 : _config$sitemap6.output) || config.output || 'sitemap.xml',
          generateRobots: ((_config$robots = config.robots) == null ? void 0 : _config$robots.generateRobots) !== undefined ? config.robots.generateRobots : true,
          addSitemapReference: ((_config$robots2 = config.robots) == null ? void 0 : _config$robots2.addSitemapReference) !== undefined ? config.robots.addSitemapReference : true,
          disallowPaths: ((_config$robots3 = config.robots) == null ? void 0 : _config$robots3.disallowPaths) || [],
          userAgent: ((_config$robots4 = config.robots) == null ? void 0 : _config$robots4.userAgent) || '*'
        };
        return processRobots(files, metalsmith, robotsOptions);
      }
    }).then(() => done()).catch(done);
  };
}

// Set function name for better debugging
Object.defineProperty(plugin, 'name', {
  value: 'metalsmith-seo'
});

export { plugin as default };
//# sourceMappingURL=index.js.map
