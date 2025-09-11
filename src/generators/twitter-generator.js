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
export function generateTwitterCardTags(metadata, siteConfig = {}) {
  const metaTags = [];

  // Determine card type
  const cardType = determineCardType(metadata, siteConfig);

  // Core Twitter Card tags
  addCoreTwitterTags(metaTags, metadata, siteConfig, cardType);

  // Card type-specific tags
  switch (cardType) {
    case "summary_large_image":
      addSummaryLargeImageTags(metaTags, metadata);
      break;
    case "summary":
      addSummaryTags(metaTags, metadata);
      break;
    case "app":
      addAppTags(metaTags, metadata, siteConfig);
      break;
    case "player":
      addPlayerTags(metaTags, metadata);
      break;
    default:
      // Default to summary
      addSummaryTags(metaTags, metadata);
      break;
  }

  return { metaTags };
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
    return "summary_large_image";
  }

  if (metadata.type === "video" || metadata.videoUrl) {
    return "player";
  }

  if (metadata.type === "app" || metadata.appId) {
    return "app";
  }

  return "summary";
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
    name: "twitter:card",
    content: cardType,
  });

  // twitter:site (recommended)
  if (siteConfig.twitterSite) {
    metaTags.push({
      name: "twitter:site",
      content: ensureTwitterHandle(siteConfig.twitterSite),
    });
  }

  // twitter:creator (optional)
  const creator =
    metadata.twitterCreator || metadata.author || siteConfig.twitterCreator;
  if (creator) {
    metaTags.push({
      name: "twitter:creator",
      content: ensureTwitterHandle(creator),
    });
  }

  // twitter:title (falls back to og:title)
  if (metadata.title) {
    // Twitter titles should be shorter than OG titles
    const twitterTitle = truncateTitle(metadata.title, 70);
    metaTags.push({
      name: "twitter:title",
      content: twitterTitle,
    });
  }

  // twitter:description (falls back to og:description)
  if (metadata.description) {
    // Twitter descriptions should be shorter
    const maxLength = siteConfig.twitterDescriptionLength || 200;
    const twitterDescription = truncateDescription(
      metadata.description,
      maxLength,
    );
    metaTags.push({
      name: "twitter:description",
      content: twitterDescription,
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
      name: "twitter:image",
      content: metadata.image,
    });

    // Image alt text (accessibility)
    const imageAlt = metadata.imageAlt || metadata.title || "Image";
    metaTags.push({
      name: "twitter:image:alt",
      content: imageAlt,
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
      name: "twitter:image",
      content: metadata.image,
    });

    // Image alt text (accessibility)
    const imageAlt = metadata.imageAlt || metadata.title || "Image";
    metaTags.push({
      name: "twitter:image:alt",
      content: imageAlt,
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
      name: "twitter:app:id:iphone",
      content: metadata.iosAppId || siteConfig.iosAppId,
    });
  }

  if (metadata.iosAppUrl || siteConfig.iosAppUrl) {
    metaTags.push({
      name: "twitter:app:url:iphone",
      content: metadata.iosAppUrl || siteConfig.iosAppUrl,
    });
  }

  // Android app
  if (metadata.androidAppId || siteConfig.androidAppId) {
    metaTags.push({
      name: "twitter:app:id:googleplay",
      content: metadata.androidAppId || siteConfig.androidAppId,
    });
  }

  if (metadata.androidAppUrl || siteConfig.androidAppUrl) {
    metaTags.push({
      name: "twitter:app:url:googleplay",
      content: metadata.androidAppUrl || siteConfig.androidAppUrl,
    });
  }

  // App name
  if (metadata.appName || siteConfig.appName) {
    metaTags.push({
      name: "twitter:app:name:iphone",
      content: metadata.appName || siteConfig.appName,
    });
    metaTags.push({
      name: "twitter:app:name:googleplay",
      content: metadata.appName || siteConfig.appName,
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
      name: "twitter:player",
      content: metadata.videoUrl,
    });
  }

  if (metadata.videoWidth) {
    metaTags.push({
      name: "twitter:player:width",
      content: String(metadata.videoWidth),
    });
  }

  if (metadata.videoHeight) {
    metaTags.push({
      name: "twitter:player:height",
      content: String(metadata.videoHeight),
    });
  }

  if (metadata.videoStreamUrl) {
    metaTags.push({
      name: "twitter:player:stream",
      content: metadata.videoStreamUrl,
    });
  }

  // Player image (thumbnail)
  if (metadata.image) {
    metaTags.push({
      name: "twitter:image",
      content: metadata.image,
    });
  }
}

/**
 * Ensures Twitter handle has @ prefix
 * @param {string} handle - Twitter handle
 * @returns {string} Formatted Twitter handle
 */
function ensureTwitterHandle(handle) {
  if (typeof handle !== "string") {
    return String(handle);
  }

  const cleaned = handle.trim();
  return cleaned.startsWith("@") ? cleaned : `@${cleaned}`;
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
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.8) {
    return `${title.substring(0, lastSpace)}...`;
  }

  return `${truncated}...`;
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
  const lastSentence = truncated.lastIndexOf(".");
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSentence > maxLength * 0.6) {
    return description.substring(0, lastSentence + 1);
  }

  if (lastSpace > maxLength * 0.8) {
    return `${description.substring(0, lastSpace)}...`;
  }

  return `${truncated}...`;
}

/**
 * Converts Twitter Card meta tags to HTML string
 * @param {Array} metaTags - Array of meta tag objects
 * @returns {string} HTML meta tags
 */
export function twitterCardTagsToHtml(metaTags) {
  return metaTags
    .map((tag) => {
      const name = escapeHtml(tag.name);
      const content = escapeHtml(tag.content);
      return `<meta name="${name}" content="${content}">`;
    })
    .join("\n");
}

/**
 * Escapes HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (typeof str !== "string") {
    return String(str);
  }

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
