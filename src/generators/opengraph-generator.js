/**
 * @fileoverview Generator for Open Graph meta tags.
 */

// Image type mapping for Open Graph images
const IMAGE_TYPE_MAP = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

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
export function generateOpenGraphTags(metadata, siteConfig = {}) {
  const metaTags = [];

  // Core Open Graph tags
  addCoreOpenGraphTags(metaTags, metadata, siteConfig);

  // Type-specific tags
  switch (metadata.type) {
    case "article":
      addArticleOpenGraphTags(metaTags, metadata);
      break;
    case "product":
      addProductOpenGraphTags(metaTags, metadata);
      break;
    case "profile":
      addProfileOpenGraphTags(metaTags, metadata);
      break;
    default:
      // 'website' type is default, no additional tags needed
      break;
  }

  // Site-specific tags
  addSiteOpenGraphTags(metaTags, siteConfig);

  return { metaTags };
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
      property: "og:title",
      content: metadata.title,
    });
  }

  // og:type (required)
  const ogType = mapContentTypeToOGType(metadata.type);
  metaTags.push({
    property: "og:type",
    content: ogType,
  });

  // og:url (required)
  if (metadata.canonicalURL) {
    metaTags.push({
      property: "og:url",
      content: metadata.canonicalURL,
    });
  }

  // og:description
  if (metadata.description) {
    metaTags.push({
      property: "og:description",
      content: metadata.description,
    });
  }

  // og:image (recommended)
  if (metadata.image) {
    metaTags.push({
      property: "og:image",
      content: metadata.image,
    });

    // Add image metadata if available
    addImageMetadata(metaTags, metadata, siteConfig);
  }

  // og:site_name
  if (siteConfig.siteName) {
    metaTags.push({
      property: "og:site_name",
      content: siteConfig.siteName,
    });
  }

  // og:locale
  const locale = siteConfig.locale || siteConfig.language || "en_US";
  metaTags.push({
    property: "og:locale",
    content: locale,
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
    property: "og:image:width",
    content: String(defaultWidth),
  });

  metaTags.push({
    property: "og:image:height",
    content: String(defaultHeight),
  });

  // Image alt text (accessibility)
  const imageAlt = metadata.imageAlt || metadata.title || "Image";
  metaTags.push({
    property: "og:image:alt",
    content: imageAlt,
  });

  // Image type (if known)
  if (metadata.image) {
    const imageType = getImageType(metadata.image);
    if (imageType) {
      metaTags.push({
        property: "og:image:type",
        content: imageType,
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
      property: "article:published_time",
      content: new Date(metadata.publishDate).toISOString(),
    });
  }

  // article:modified_time
  if (metadata.modifiedDate) {
    metaTags.push({
      property: "article:modified_time",
      content: new Date(metadata.modifiedDate).toISOString(),
    });
  }

  // article:author
  if (metadata.author) {
    metaTags.push({
      property: "article:author",
      content: metadata.author,
    });
  }

  // article:section
  if (metadata.section) {
    metaTags.push({
      property: "article:section",
      content: metadata.section,
    });
  }

  // article:tag (multiple tags)
  if (metadata.keywords && metadata.keywords.length > 0) {
    metadata.keywords.forEach((tag) => {
      metaTags.push({
        property: "article:tag",
        content: tag,
      });
    });
  }

  // Reading time (custom property)
  if (metadata.readingTime) {
    metaTags.push({
      property: "article:reading_time",
      content: metadata.readingTime,
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
      property: "product:brand",
      content: metadata.brand,
    });
  }

  // product:availability
  if (metadata.availability) {
    metaTags.push({
      property: "product:availability",
      content: metadata.availability,
    });
  }

  // product:condition
  if (metadata.condition) {
    metaTags.push({
      property: "product:condition",
      content: metadata.condition,
    });
  }

  // product:price
  if (metadata.price) {
    metaTags.push({
      property: "product:price:amount",
      content: String(metadata.price),
    });
  }

  // product:price:currency
  if (metadata.currency) {
    metaTags.push({
      property: "product:price:currency",
      content: metadata.currency,
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
      property: "profile:first_name",
      content: metadata.firstName,
    });
  }

  // profile:last_name
  if (metadata.lastName) {
    metaTags.push({
      property: "profile:last_name",
      content: metadata.lastName,
    });
  }

  // profile:username
  if (metadata.username) {
    metaTags.push({
      property: "profile:username",
      content: metadata.username,
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
      property: "fb:app_id",
      content: siteConfig.facebookAppId,
    });
  }

  // Facebook Admins
  if (siteConfig.facebookAdmins) {
    const admins = Array.isArray(siteConfig.facebookAdmins)
      ? siteConfig.facebookAdmins
      : [siteConfig.facebookAdmins];

    admins.forEach((admin) => {
      metaTags.push({
        property: "fb:admins",
        content: String(admin),
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
    article: "article",
    product: "product",
    profile: "profile",
    page: "website",
    "local-business": "business.business",
  };

  return typeMap[contentType] || "website";
}

/**
 * Determines image MIME type from file extension
 * @param {string} imageUrl - Image URL
 * @returns {string|null} MIME type
 */
function getImageType(imageUrl) {
  const extension = imageUrl.split(".").pop()?.toLowerCase();
  return IMAGE_TYPE_MAP[extension] || null;
}

/**
 * Converts Open Graph meta tags to HTML string
 * @param {Array} metaTags - Array of meta tag objects
 * @returns {string} HTML meta tags
 */
export function openGraphTagsToHtml(metaTags) {
  return metaTags
    .map((tag) => {
      const property = escapeHtml(tag.property);
      const content = escapeHtml(tag.content);
      return `<meta property="${property}" content="${content}">`;
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
