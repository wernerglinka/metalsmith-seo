/**
 * @fileoverview Comprehensive Metalsmith SEO plugin with head optimization, social media tags, and structured data.
 * @author Werner Glinka
 */

/**
 * Dependencies
 */
import { batchOptimizeHeads } from './processors/head-optimizer.js';
import { processSitemap } from './processors/sitemap.js';
import { processRobots } from './processors/robots.js';
import { processLlms } from './processors/llms.js';
import { buildConfig, validateConfig } from './utils/config-builder.js';
import { get } from './utils/object-utils.js';

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
 * @property {boolean} [enableLlms=false] - Whether to generate llms.txt
 * @property {Object} [llms] - llms.txt generation options
 * @property {number} [batchSize=10] - Number of files to process in parallel
 * @property {number} [wordsPerMinute=200] - Reading speed for calculating reading time
 */

/**
 * @typedef {Object} SocialConfig
 * @property {string} [siteName] - Site name for Open Graph
 * @property {string} [locale='en_US'] - Default locale
 * @property {string} [twitterSite] - Twitter site handle (@username)
 * @property {string} [twitterCreator] - Default Twitter creator handle
 * @property {string} [facebookAppId] - Facebook App ID
 * @property {string|Array<string>} [facebookAdmins] - Facebook admin IDs
 * @property {string} [viewport] - Viewport meta tag content
 * @property {number} [twitterDescriptionLength=200] - Max length for Twitter descriptions
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
 * @returns {Function} Configured plugin function
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
  let pluginOptions = options;

  // Accept string option to specify the hostname
  if (typeof pluginOptions === 'string') {
    try {
      new URL(pluginOptions);
      pluginOptions = { hostname: pluginOptions };
    } catch {
      throw new Error(`Invalid URL provided as hostname: ${pluginOptions}`);
    }
  }

  /**
   * Main plugin function that processes files for comprehensive SEO optimization.
   * @param {Object} files - Object containing all files in the build
   * @param {Object} metalsmith - Metalsmith instance for accessing utilities
   * @param {Function} done - Callback to signal completion
   * @returns {void}
   */
  return function (files, metalsmith, done) {
    // Get the metadata path (default to 'site')
    const metadataPath = pluginOptions.metadataPath || 'site';

    // Get site metadata from the configured path
    const siteMetadata = get(metalsmith.metadata(), metadataPath, {});

    // Get the configurable SEO property name (defaults to "seo")
    const seoProperty = pluginOptions.seoProperty || 'seo';

    /**
     * Build the complete configuration
     * Configuration will be merged with site metadata, file frontmatter,
     * deduced values and defaults in priority order:
     * pluginOptions > siteMetadata > deduced values > defaults
     */
    const config = buildConfig(pluginOptions, siteMetadata, files, seoProperty);

    // Validate configuration
    validateConfig(config, metadataPath);

    /**
     * Optimize <head> section
     * Includes title, description, and social tags
     */
    const headOptimization = batchOptimizeHeads(files, config);

    // Sitemap generation
    let sitemapGeneration = Promise.resolve();
    if (config.enableSitemap) {
      // Add hostname to sitemap config (required by processor)
      config.sitemap.hostname = config.hostname;

      sitemapGeneration = processSitemap(files, metalsmith, config.sitemap);
    }

    // Execute head optimization and sitemap in parallel.
    // Safe because head optimization mutates file.contents while the
    // sitemap reads only frontmatter. If you change the head pass to
    // write back into frontmatter, this parallelism becomes unsound.
    // See docs/THEORY.md §7 ("Parallel head pass + sitemap").
    Promise.all([headOptimization, sitemapGeneration])
      .then(() => {
        // Robots.txt generation/update - after sitemap is done
        if (config.enableRobots) {
          // Add required runtime values to robots config
          config.robots.hostname = config.hostname;
          config.robots.sitemapFile = config.sitemap.output;

          return processRobots(files, metalsmith, config.robots);
        }
      })
      .then(() => {
        // llms.txt generation - opt-in, runs after robots
        if (config.enableLlms) {
          config.llms.hostname = config.hostname;
          config.llms.seoProperty = config.seoProperty;
          // Sensible header defaults pulled from site metadata
          if (!config.llms.title) {
            config.llms.title = config.social.siteName || config.defaults.title || 'Site';
          }
          if (!config.llms.description) {
            config.llms.description = config.defaults.description || undefined;
          }
          // Default locale -> root emission: resolved from social.locale so
          // multilingual sites put /llms.txt at the root for their primary
          // language without extra config. The locale matcher is tolerant of
          // short/full forms ('en' vs 'en_US'). Set defaultLocale: '' to
          // disable root emission and keep every locale under its prefix.
          if (config.llms.defaultLocale === undefined) {
            config.llms.defaultLocale = config.social?.locale || '';
          }
          return processLlms(files, metalsmith, config.llms);
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
 * @type {function(Options): Function}
 * @default
 */
export default plugin;
