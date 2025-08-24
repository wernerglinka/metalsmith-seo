/**
 * @fileoverview Configuration building utilities for the SEO plugin.
 * Extracts and merges configuration from multiple sources with proper fallback handling.
 * @author Werner Glinka
 */

/**
 * Get nested property from an object using dot notation path
 * @param {Object} obj - The object to query
 * @param {string} path - The path to the property (e.g., 'site' or 'data.site')
 * @returns {*} The value at the path, or undefined if not found
 */
function getNestedProperty(obj, path) {
  if (!path || !obj) {
    return undefined;
  }

  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Helper to conditionally add properties to an object
 * @param {Object} source - Source object to read from
 * @param {Object} mapping - Mapping of source keys to target keys
 * @returns {Object} Object with only defined properties
 */
function pickDefined(source, mapping) {
  const result = {};
  for (const [sourceKey, targetKey] of Object.entries(mapping)) {
    if (source[sourceKey] !== undefined) {
      result[targetKey] = source[sourceKey];
    }
  }
  return result;
}

/**
 * Attempts to deduce site metadata from the index file when no site metadata exists
 * @param {Object} files - Metalsmith files object
 * @param {string} seoProperty - The SEO property name to check
 * @param {Object} pluginDefaults - Plugin default values
 * @returns {Object} Object with deduced siteName and description
 */
function deduceSiteMetadata(files, seoProperty, pluginDefaults) {
  let deducedSiteName = "";
  let deducedDescription = "";

  const indexFile = files["index.html"] || files["index.md"];
  if (indexFile) {
    // Deduce site name if no plugin default title exists
    if (!pluginDefaults?.title) {
      // Check multiple possible locations for title in order of preference:
      // 1. [seoProperty].title (SEO-specific title, e.g., seo.title)
      // 2. title (root-level title)
      deducedSiteName = indexFile[seoProperty]?.title || indexFile.title;
    }

    // Deduce description if no plugin default description exists
    if (!pluginDefaults?.description) {
      // Check multiple possible locations for description in order of preference:
      // 1. [seoProperty].description (SEO-specific description, e.g., seo.description)
      // 2. description (root-level description)
      // 3. excerpt (common in blog posts)
      deducedDescription =
        indexFile[seoProperty]?.description ||
        indexFile.description ||
        indexFile.excerpt;
    }
  }

  return { deducedSiteName, deducedDescription };
}

/**
 * Builds the complete configuration object by merging plugin options, site metadata, and deduced values
 * @param {Object} pluginOptions - Options passed to the plugin
 * @param {Object} siteMetadata - Site metadata from Metalsmith
 * @param {Object} files - Metalsmith files object
 * @param {string} seoProperty - The SEO property name
 * @returns {Object} Complete merged configuration
 */
export function buildConfig(pluginOptions, siteMetadata, files, seoProperty) {
  const hasSiteMetadata = Object.keys(siteMetadata).length > 0;
  let deducedSiteName = "";
  let deducedDescription = "";

  // Attempt to deduce site name and description when no site metadata exists
  // and no plugin defaults are provided. These fallbacks help provide reasonable
  // values for social media and SEO tags
  if (!hasSiteMetadata) {
    const deduced = deduceSiteMetadata(
      files,
      seoProperty,
      pluginOptions.defaults,
    );
    deducedSiteName = deduced.deducedSiteName;
    deducedDescription = deduced.deducedDescription;
  }

  // Merge configurations: deduced < site defaults < plugin options
  const config = {
    // Site-wide defaults from site.json or deduced
    hostname: siteMetadata.url || pluginOptions.hostname,
    defaults: {
      title:
        pluginOptions.defaults?.title || siteMetadata.title || deducedSiteName,
      description:
        pluginOptions.defaults?.description ||
        siteMetadata.description ||
        deducedDescription,
      socialImage:
        pluginOptions.defaults?.socialImage ||
        siteMetadata.socialImage ||
        siteMetadata.defaultImage ||
        "",
      siteOwner:
        pluginOptions.defaults?.siteOwner || siteMetadata.siteOwner || "",
      ...(pluginOptions.defaults || {}),
    },
    social: {
      siteName:
        pluginOptions.social?.siteName ||
        siteMetadata.name ||
        siteMetadata.title ||
        deducedSiteName,
      locale: pluginOptions.social?.locale || siteMetadata.locale || "en_US",
      twitterSite: pluginOptions.social?.twitterSite || siteMetadata.twitter,
      facebookAppId:
        pluginOptions.social?.facebookAppId || siteMetadata.facebookAppId,
      ...(siteMetadata.social || {}),
      ...(pluginOptions.social || {}),
    },
    jsonLd: {
      organization:
        pluginOptions.jsonLd?.organization || siteMetadata.organization,
      ...(siteMetadata.jsonLd || {}),
      ...(pluginOptions.jsonLd || {}),
    },

    // Plugin-specific options (not typically in site.json)
    seoProperty,
    enableSitemap:
      pluginOptions.enableSitemap !== undefined
        ? pluginOptions.enableSitemap
        : true,
    enableRobots:
      pluginOptions.enableRobots !== undefined
        ? pluginOptions.enableRobots
        : true,
    batchSize: pluginOptions.batchSize || 10,

    // Fallback mappings
    fallbacks: pluginOptions.fallbacks || {
      title: "title",
      description: "excerpt",
      image: "featured_image",
      author: "author",
    },

    // Complete sitemap configuration - merge all sources once with defaults
    // Priority: pluginOptions.sitemap > pluginOptions (legacy) > siteMetadata.sitemap > defaults
    sitemap: {
      // Defaults
      output: "sitemap.xml",
      pattern: "**/*.html",
      omitIndex: false,
      omitExtension: false,
      urlProperty: "canonical",
      modifiedProperty: "lastmod",
      privateProperty: "private",
      priorityProperty: "priority",
      auto: true,

      // Merge site metadata
      ...(siteMetadata.sitemap || {}),

      // Apply legacy root-level options (for backward compatibility)
      ...pickDefined(pluginOptions, {
        output: "output",
        pattern: "pattern",
        omitIndex: "omitIndex",
        omitExtension: "omitExtension",
        changefreq: "changefreq",
        priority: "priority",
        lastmod: "lastmod",
        links: "links",
        urlProperty: "urlProperty",
        modifiedProperty: "modifiedProperty",
        privateProperty: "privateProperty",
        priorityProperty: "priorityProperty",
        auto: "auto",
      }),

      // Override with explicit sitemap config (highest priority)
      ...(pluginOptions.sitemap || {}),
    },

    // Complete robots configuration with defaults
    robots: {
      // Defaults
      generateRobots: true,
      addSitemapReference: true,
      disallowPaths: [],
      userAgent: "*",

      // Merge site metadata
      ...(siteMetadata.robots || {}),

      // Override with explicit robots config
      ...(pluginOptions.robots || {}),
    },
  };

  return config;
}

/**
 * Validates the final configuration and throws helpful errors if required values are missing
 * @param {Object} config - The built configuration object
 * @param {string} metadataPath - The metadata path used for error messaging
 * @throws {Error} When hostname is not provided
 */
export function validateConfig(config, metadataPath) {
  if (!config.hostname) {
    const metadataHint =
      metadataPath === "site" ? "site.url" : `${metadataPath}.url`;
    throw new Error(
      `[metalsmith-seo] hostname is required (set in plugin options or ${metadataHint} in metadata)`,
    );
  }
}

export { getNestedProperty };
