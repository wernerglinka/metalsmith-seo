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
export function generateMetaTags(metadata, siteConfig = {}) {
  const metaTags = [];
  const linkTags = [];

  // Basic meta tags
  if (metadata.description) {
    metaTags.push({
      name: "description",
      content: metadata.description,
    });
  }

  if (metadata.keywords && metadata.keywords.length > 0) {
    metaTags.push({
      name: "keywords",
      content: Array.isArray(metadata.keywords)
        ? metadata.keywords.join(", ")
        : metadata.keywords,
    });
  }

  // Robots directive
  const robots = generateRobotsDirective(metadata, siteConfig);
  if (robots) {
    metaTags.push({
      name: "robots",
      content: robots,
    });
  }

  // Author
  if (metadata.author) {
    metaTags.push({
      name: "author",
      content: metadata.author,
    });
  }

  // Viewport (configurable for mobile optimization)
  const viewportContent = siteConfig.viewport || "width=device-width, initial-scale=1.0";
  metaTags.push({
    name: "viewport",
    content: viewportContent,
  });

  // Canonical URL
  if (metadata.canonicalURL) {
    linkTags.push({
      rel: "canonical",
      href: metadata.canonicalURL,
    });
  }

  // Theme color (if specified in site config)
  if (siteConfig.themeColor) {
    metaTags.push({
      name: "theme-color",
      content: siteConfig.themeColor,
    });
  }

  // Additional technical meta tags
  addTechnicalMetaTags(metaTags, metadata, siteConfig);

  return {
    title: metadata.title,
    metaTags,
    linkTags,
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
    return "noindex,nofollow";
  }

  if (metadata.robots) {
    return metadata.robots;
  }

  // Default based on content type
  switch (metadata.type) {
    case "article":
      return "index,follow";
    case "page":
      return "index,follow";
    case "product":
      return "index,follow";
    default:
      return siteConfig.defaultRobots || "index,follow";
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
      httpEquiv: "content-language",
      content: siteConfig.language,
    });
  }

  // Publisher
  if (siteConfig.publisher) {
    metaTags.push({
      name: "publisher",
      content: siteConfig.publisher,
    });
  }

  // Copyright
  if (siteConfig.copyright) {
    metaTags.push({
      name: "copyright",
      content: siteConfig.copyright,
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
      name: "googlebot",
      content: googlebotDirectives.join(","),
    });
  }

  // Article-specific meta tags
  if (metadata.type === "article") {
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
      name: "article:published_time",
      content: date.toISOString(),
    });
  }

  if (metadata.modifiedDate) {
    const date = new Date(metadata.modifiedDate);
    metaTags.push({
      name: "article:modified_time",
      content: date.toISOString(),
    });
  }

  if (metadata.author) {
    metaTags.push({
      name: "article:author",
      content: metadata.author,
    });
  }

  if (metadata.keywords && metadata.keywords.length > 0) {
    metadata.keywords.forEach((keyword) => {
      metaTags.push({
        name: "article:tag",
        content: keyword,
      });
    });
  }
}

/**
 * Converts meta tags array to HTML string
 * @param {Array} metaTags - Array of meta tag objects
 * @returns {string} HTML meta tags
 */
export function metaTagsToHtml(metaTags) {
  return metaTags
    .map((tag) => {
      const attributes = [];

      if (tag.name) {
        attributes.push(`name="${escapeHtml(tag.name)}"`);
      }
      if (tag.property) {
        attributes.push(`property="${escapeHtml(tag.property)}"`);
      }
      if (tag.httpEquiv) {
        attributes.push(`http-equiv="${escapeHtml(tag.httpEquiv)}"`);
      }
      if (tag.content) {
        attributes.push(`content="${escapeHtml(tag.content)}"`);
      }

      return `<meta ${attributes.join(" ")}>`;
    })
    .join("\n");
}

/**
 * Converts link tags array to HTML string
 * @param {Array} linkTags - Array of link tag objects
 * @returns {string} HTML link tags
 */
export function linkTagsToHtml(linkTags) {
  return linkTags
    .map((tag) => {
      const attributes = [];

      if (tag.rel) {
        attributes.push(`rel="${escapeHtml(tag.rel)}"`);
      }
      if (tag.href) {
        attributes.push(`href="${escapeHtml(tag.href)}"`);
      }
      if (tag.type) {
        attributes.push(`type="${escapeHtml(tag.type)}"`);
      }
      if (tag.sizes) {
        attributes.push(`sizes="${escapeHtml(tag.sizes)}"`);
      }

      // Add any other attributes
      Object.entries(tag).forEach(([key, value]) => {
        if (!["rel", "href", "type", "sizes"].includes(key)) {
          attributes.push(`${key}="${escapeHtml(value)}"`);
        }
      });

      return `<link ${attributes.join(" ")}>`;
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
