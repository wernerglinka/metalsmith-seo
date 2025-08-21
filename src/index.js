/**
 * @fileoverview Comprehensive Metalsmith SEO plugin with head optimization, social media tags, and structured data.
 * @author Werner Glinka
 */

/**
 * Dependencies
 */
import { batchOptimizeHeads } from "./processors/head-optimizer.js";
import { processSitemap } from "./processors/sitemap.js";
import { processRobots } from "./processors/robots.js";

/**
 * Cache for site metadata checks to avoid repeated expensive operations
 * @type {Object}
 */
let siteMetadataCache = null;

/**
 * Reset the site metadata cache - useful for testing or when switching projects
 * @returns {void}
 */
function resetCache() {
  siteMetadataCache = null;
}

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
    opts = { hostname: opts };
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
      // First run - check and cache
      // Try to get site metadata from the configured path
      siteMetadata = getNestedProperty(metalsmith.metadata(), metadataPath) || {};
      hasSiteMetadata = Object.keys(siteMetadata).length > 0;
      deducedSiteName = null;
      deducedDescription = null;
      
      if (!hasSiteMetadata && !pluginOptions.defaults?.title) {
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
        title: pluginOptions.defaults?.title || siteMetadata.title || deducedSiteName,
        description: pluginOptions.defaults?.description || siteMetadata.description || deducedDescription,
        socialImage: pluginOptions.defaults?.socialImage || siteMetadata.socialImage || siteMetadata.defaultImage,
        ...(pluginOptions.defaults || {})
      },
      social: {
        siteName: pluginOptions.social?.siteName || siteMetadata.name || siteMetadata.title || deducedSiteName,
        locale: pluginOptions.social?.locale || siteMetadata.locale || 'en_US',
        twitterSite: pluginOptions.social?.twitterSite || siteMetadata.twitter,
        facebookAppId: pluginOptions.social?.facebookAppId || siteMetadata.facebookAppId,
        ...(siteMetadata.social || {}),
        ...(pluginOptions.social || {})
      },
      jsonLd: {
        organization: pluginOptions.jsonLd?.organization || siteMetadata.organization,
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
      const metadataHint = metadataPath === 'site' 
        ? 'site.url' 
        : `${metadataPath}.url`;
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
        // Only log if we're using site metadata values
        const usingSiteValues = [];
        if (siteMetadata.url && !pluginOptions.hostname) usingSiteValues.push('hostname');
        if (siteMetadata.title && !pluginOptions.defaults?.title) usingSiteValues.push('title');
        if (siteMetadata.description && !pluginOptions.defaults?.description) usingSiteValues.push('description');
        
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
      // Merge sitemap-specific options
      const sitemapOptions = {
        hostname: config.hostname,
        output: config.sitemap?.output || config.output || 'sitemap.xml',
        pattern: config.sitemap?.pattern || config.pattern || '**/*.html',
        omitIndex: config.sitemap?.omitIndex !== undefined ? config.sitemap.omitIndex : (config.omitIndex || false),
        omitExtension: config.sitemap?.omitExtension !== undefined ? config.sitemap.omitExtension : (config.omitExtension || false),
        auto: config.sitemap?.auto !== undefined ? config.sitemap.auto : (config.auto !== undefined ? config.auto : true),
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
    Promise.all([headOptimization, sitemapGeneration])
      .then(() => {
        // Robots.txt generation/update (if enabled) - after sitemap is done
        if (config.enableRobots) {
          const robotsOptions = {
            hostname: config.hostname,
            sitemapFile: config.sitemap?.output || config.output || 'sitemap.xml',
            generateRobots: config.robots?.generateRobots !== undefined ? config.robots.generateRobots : true,
            addSitemapReference: config.robots?.addSitemapReference !== undefined ? config.robots.addSitemapReference : true,
            disallowPaths: config.robots?.disallowPaths || [],
            userAgent: config.robots?.userAgent || '*'
          };

          return processRobots(files, metalsmith, robotsOptions);
        }
      })
      .then(() => done())
      .catch(done);
  };
}

// Set function name for better debugging
Object.defineProperty(plugin, 'name', { value: 'metalsmith-seo' });

/**
 * Metalsmith plugin factory function.
 * @type {function(Options): import('metalsmith').Plugin}
 * @default
 */
export default plugin;