/**
 * @fileoverview URL building and validation utilities for sitemap generation.
 */

import path from "path";
import { get } from "../utils/object-utils.js";

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
export function checkFile(file, frontmatter, metalsmith, pattern, privateProperty) {
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
export function buildUrl(file, frontmatter, options) {
  const { urlProperty, omitIndex, omitExtension } = options;

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
export function replaceBackslash(url) {
  return url.replace(/\\/g, "/");
}