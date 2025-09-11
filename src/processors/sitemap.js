/**
 * @fileoverview Lightweight sitemap processor for generating sitemap.xml files.
 *
 * Sitemaps are fundamentally simple XML files with a well-defined structure.
 * Rather than using a heavy external library with streaming APIs and complex
 * features we don't need, this implementation generates XML directly using
 * string concatenation.
 *
 * ## XML Format Compliance
 *
 * This implementation generates valid XML sitemaps according to the sitemaps.org protocol:
 * - Standard XML declaration with UTF-8 encoding
 * - Proper namespace declarations for sitemap and xhtml (when needed)
 * - XML character escaping for security (prevents XXE and other XML attacks)
 * - Support for all standard sitemap elements: loc, lastmod, changefreq, priority
 * - Support for alternate language links (hreflang) via xhtml:link elements
 * 
 * ## Attribution
 * 
 * Inspired by and adapted from metalsmith-sitemap by Segment.io
 * Original: https://github.com/segmentio/metalsmith-sitemap
 * License: MIT
 */

import path from "path";
import { get } from "../utils/object-utils.js";
import { checkFile, buildUrl } from "./url-builder.js";
import { calculatePriority, calculateChangefreq } from "./auto-calculator.js";
import { generateSitemapXML } from "../utils/xml-generator.js";

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
 * Processes Metalsmith files and generates a sitemap.xml file.
 *
 * This is the main entry point for sitemap generation. It:
 * 1. Filters files based on pattern matching and privacy settings
 * 2. Extracts metadata (lastmod, changefreq, priority) from frontmatter
 * 3. Handles automatic priority/changefreq calculation if enabled
 * 4. Processes alternate language links (hreflang)
 * 5. Generates the final XML content and adds it to the files object
 *
 * ## File Processing Logic
 *
 * Files are processed in a specific order to ensure consistent output:
 * - Root level files first (depth 1), then subdirectories
 * - Alphabetical sorting within the same directory depth
 * - Only processes files with Buffer contents (skips virtual files)
 * - Respects pattern matching and privacy exclusions
 *
 * ## Date Handling
 *
 * All dates are normalized to midnight UTC. This ensures consistent output
 * regardless of timezone:
 * - JavaScript Date objects: Converted to ISO string with time set to 00:00:00.000Z
 * - String dates: Parsed and normalized to midnight UTC
 * - Invalid dates: Skipped (no lastmod element generated)
 *
 * ## Priority Formatting
 *
 * Numeric priorities are formatted with one decimal place to match original behavior:
 * - 1 becomes "1.0"
 * - 0.5 becomes "0.5"
 * - String priorities are passed through unchanged
 *
 * ## Auto-calculation Features
 *
 * When auto=true, priority and changefreq are calculated based on:
 * - File path depth (shallower = higher priority)
 * - Content type patterns (/blog/, /products/, etc.)
 * - Last modification date (recent = higher priority)
 * - Content length (longer = slightly higher priority)
 *
 * @param {Object} files - Metalsmith files object containing all site files
 * @param {Object} metalsmith - Metalsmith instance for utilities like pattern matching
 * @param {SitemapOptions} options - Configuration options for sitemap generation
 * @returns {Promise<void>} Resolves when sitemap has been generated and added to files
 *
 * @example
 * // Basic usage
 * await processSitemap(files, metalsmith, {
 *   hostname: 'https://example.com',
 *   pattern: '**\/*.html'
 * });
 *
 * @example
 * // With auto-calculation and custom settings
 * await processSitemap(files, metalsmith, {
 *   hostname: 'https://example.com',
 *   auto: true,
 *   output: 'custom-sitemap.xml',
 *   omitExtension: true,
 *   links: 'alternateLinks' // Property name for hreflang links
 * });
 */
export function processSitemap( files, metalsmith, options ) {
  return new Promise( ( resolve, reject ) => {
    try {
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
      } = options;

      const links = [];

      // Custom sorting to ensure consistent output order
      // Files in root directory come first, then subdirectories
      const sortedFiles = Object.keys( files ).sort( ( a, b ) => {
        const aDepth = a.split( path.sep ).length;
        const bDepth = b.split( path.sep ).length;
        if ( aDepth !== bDepth ) {
          return aDepth - bDepth; // Shallower paths first
        }
        return a.localeCompare( b ); // Alphabetical within same depth
      } );

      sortedFiles.forEach( function( file ) {
        // Get the current file's frontmatter
        const frontmatter = files[ file ];

        // Validate file.contents is a Buffer before processing
        if ( !Buffer.isBuffer( frontmatter.contents ) ) {
          return;
        }

        // Only process files that pass the check
        if (
          !checkFile( file, frontmatter, metalsmith, pattern, privateProperty )
        ) {
          return;
        }

        // Get lastmod value and format it properly
        let lastmodValue = get( frontmatter, modifiedProperty ) || lastmod;
        if ( lastmodValue instanceof Date ) {
          // Format date as ISO string to match old library behavior
          // The old sitemap library normalized times to midnight UTC
          const d = new Date( lastmodValue );
          d.setUTCHours( 0, 0, 0, 0 );
          lastmodValue = d.toISOString();
        } else if ( typeof lastmodValue === "string" ) {
          // Parse the date string
          const parsed = new Date( lastmodValue );
          if ( !isNaN( parsed.getTime() ) ) {
            // Normalize to midnight UTC like the old library did
            parsed.setUTCHours( 0, 0, 0, 0 );
            lastmodValue = parsed.toISOString();
          }
        }

        // Create the sitemap entry (reject keys with falsy values)
        let entryChangefreq, entryPriority;

        if ( auto ) {
          /**
           * Auto mode
           * Calculate values, ignore global and frontmatter settings!
           */
          entryChangefreq = calculateChangefreq( file, frontmatter, {
            modifiedProperty,
            lastmod,
          } );
          entryPriority = calculatePriority( file );
        } else {
          /**
           * Manual mode
           * Use global defaults, allow frontmatter overrides
           */
          entryChangefreq = frontmatter.changefreq || changefreq;
          entryPriority = get( frontmatter, priorityProperty ) || priority;
        }

        const entry = Object.fromEntries(
          Object.entries( {
            changefreq: entryChangefreq,
            priority: entryPriority,
            lastmod: lastmodValue,
            links: linksOption ? get( frontmatter, linksOption ) : undefined,
          } ).filter( ( [ value ] ) => value !== undefined )
        );

        // Add the url (which is allowed to be falsy)
        entry.url = buildUrl( file, frontmatter, {
          urlProperty,
          omitIndex,
          omitExtension,
        } );

        // Add the entry to the links array
        links.push( entry );
      } );

      // Generate sitemap XML content
      const sitemapContent = generateSitemapXML( links, hostname );

      // Add the sitemap file to the files object
      files[ output ] = {
        contents: Buffer.from( sitemapContent, "utf-8" ),
      };

      resolve();
    } catch ( error ) {
      reject( new Error( `Failed to generate sitemap: ${ error.message }` ) );
    }
  } );
}
