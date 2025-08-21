/**
 * @fileoverview Sitemap processor for generating sitemap.xml files.
 */

import path from "path";
import { SitemapStream, streamToPromise } from "sitemap";
import { get, pick, identity } from "../utils/object-utils.js";
import { checkFile, buildUrl } from "./url-builder.js";
import { calculatePriority, calculateChangefreq } from "./auto-calculator.js";

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
export async function processSitemap(files, metalsmith, options) {
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

    // End the stream
    sitemap.end();

    // Convert stream to string
    const sitemapContent = await streamToPromise(sitemap);

    // Add the sitemap file to the files object
    files[output] = {
      contents: sitemapContent,
    };
  } catch (error) {
    throw new Error(`Failed to generate sitemap: ${error.message}`);
  }
}