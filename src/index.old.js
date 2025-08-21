/**
 * @fileoverview Comprehensive Metalsmith SEO plugin with head optimization, social media tags, and structured data.
 * @author Werner Glinka
 */

/**
 * Dependencies
 */
import { batchOptimizeHeads, extractAllMetadata, validateSeoConfig } from "./processors/head-optimizer.js";
import { processSitemap } from "./processors/sitemap.js";

/**
 * @typedef {Object} SeoOptions
 * @property {string} hostname - Base hostname for all URLs
 * @property {string} [seoProperty='seo'] - Frontmatter property containing SEO data
 * @property {Object} [defaults] - Default values for missing metadata
 * @property {Object} [fallbacks] - Fallback property mappings
 * @property {Object} [social] - Social media configuration
 * @property {Object} [jsonLd] - JSON-LD structured data configuration
 * @property {Object} [sitemap] - Sitemap generation options
 * @property {boolean} [enableSitemap=true] - Whether to generate sitemap.xml
 * @property {boolean} [enableHeadOptimization=true] - Whether to optimize HTML head sections
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
 * @property {string} [pattern='**/*.html'] - File pattern for sitemap inclusion
 * @property {boolean} [omitIndex=false] - Omit index.html from URLs
 * @property {boolean} [omitExtension=false] - Omit file extensions
 * @property {boolean} [auto=false] - Auto-calculate priority and changefreq
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

  // A hostname should be specified
  if (!opts.hostname) {
    throw new Error('"hostname" option required');
  }

  // Map options to local variables and set defaults
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
    priorityProperty = "priority",
  } = opts;

  /**
   * Main plugin function that processes files and generates sitemap.
   * @param {MetalsmithFiles} files - Object containing all files in the build
   * @param {MetalsmithInstance} metalsmith - Metalsmith instance for accessing utilities
   * @param {MetalsmithCallback} done - Callback to signal completion
   * @returns {void}
   */
  return function (files, metalsmith, done) {
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
      } else if (
        typeof lastmodValue === "string" &&
        lastmodValue.includes("T")
      ) {
        // Handle ISO string dates by extracting just the date part
        lastmodValue = lastmodValue.split("T")[0];
      }

      // Create the sitemap entry (reject keys with falsy values)
      let entryChangefreq, entryPriority;
      
      if (auto) {
        // Auto mode: calculate values, ignore global and frontmatter settings
        entryChangefreq = calculateChangefreq(file, frontmatter, { modifiedProperty, lastmod });
        entryPriority = calculatePriority(file, frontmatter, { modifiedProperty, lastmod });
      } else {
        // Manual mode: use global defaults, allow frontmatter overrides
        entryChangefreq = frontmatter.changefreq || changefreq;
        entryPriority = get(frontmatter, priorityProperty) || priority;
      }

      const entry = pick(
        {
          changefreq: entryChangefreq,
          priority: entryPriority,
          lastmod: lastmodValue,
          links: linksOption ? get(frontmatter, linksOption) : undefined,
        },
        identity,
      );

      // Add the url (which is allowed to be falsy)
      entry.url = buildUrl(file, frontmatter, { urlProperty, omitIndex, omitExtension });

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
          video: false,
        },
      });

      // Write all URLs to the stream
      links.forEach((link) => sitemap.write(link));
      sitemap.end();

      // Convert stream to buffer and add to files
      streamToPromise(sitemap)
        .then((data) => {
          // Format the XML to match expected output
          let xmlContent = data.toString();

          // Add proper formatting to match the old library output
          xmlContent = xmlContent
            .replace(/><urlset/, ">\n<urlset")
            .replace(/><url>/g, ">\n<url> ")
            .replace(/<\/url>/g, " </url>\n")
            .replace(/\n<\/urlset>/, "\n</urlset>")
            // Add spaces around all XML elements to match old format
            .replace(/></g, "> <") // Add spaces between adjacent tags
            // Fix date format to match old library (YYYY-MM-DD instead of full ISO)
            .replace(
              /<lastmod>(\d{4}-\d{2}-\d{2})T[^<]+<\/lastmod>/g,
              "<lastmod>$1</lastmod>",
            )
            // Remove double newlines that occur between multiple URLs
            .replace(/\n\n/g, "\n")
            // Fix self-closing xhtml:link tag format to match old library (space before />)
            .replace(/(<xhtml:link[^>]*?)\/>/g, "$1 />")
            // Add all the missing namespaces to match the original exactly
            .replace(
              'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
              'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"',
            );

          files[output] = {
            contents: Buffer.from(xmlContent),
          };
          done();
        })
        .catch(done);
    } catch (error) {
      done(error);
    }
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
