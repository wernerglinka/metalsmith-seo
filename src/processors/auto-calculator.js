/**
 * @fileoverview SEO-focused priority and changefreq calculation utilities.
 *
 * Uses sensible defaults based on URL hierarchy and content type,
 * while avoiding flawed assumptions about content length or complex patterns.
 */

import path from 'node:path';
import { get } from '../utils/object-utils.js';

/**
 * Calculates SEO-focused priority based on URL hierarchy.
 * Avoids flawed assumptions about content length or complex pattern matching.
 *
 * @param {string} file - File path relative to source directory
 * @returns {number} Calculated priority between 0.1 and 1.0
 */
export function calculatePriority(file) {
  // Homepage gets highest priority
  if (file === 'index.html' || file === 'index.htm') {
    return 1.0;
  }

  // URL depth - shallower pages are generally more important
  const pathDepth = file.split(path.sep).length;
  let priority;
  if (pathDepth === 1) {
    priority = 0.8; // Root level pages
  } else if (pathDepth === 2) {
    priority = 0.6; // One level deep
  } else if (pathDepth === 3) {
    priority = 0.4; // Two levels deep
  } else {
    priority = 0.3; // Deeper pages
  }

  // Section-level index pages get priority boost
  if (file.endsWith('index.html') && pathDepth > 1) {
    priority = Math.min(priority + 0.2, 1.0);
  }

  return Math.min(Math.max(priority, 0.1), 1.0);
}

/**
 * Calculates sensible change frequency based on URL hierarchy and content type.
 * @param {string} file - File path relative to source directory
 * @param {Object} frontmatter - File metadata and frontmatter
 * @param {Object} options - Calculation options
 * @returns {string} Calculated change frequency
 */
export function calculateChangefreq(file, frontmatter, options) {
  // Homepage and main index pages change frequently
  if (file === 'index.html' || file === 'index.htm') {
    return 'weekly';
  }

  // Section index pages update when new content is added
  if (file.endsWith('index.html')) {
    return 'monthly';
  }

  // Check for last modified date to make informed decisions
  const { modifiedProperty, lastmod } = options;
  const fileLastmod = get(frontmatter, modifiedProperty) || lastmod;

  if (fileLastmod) {
    const modDate = fileLastmod instanceof Date ? fileLastmod : new Date(fileLastmod);
    // Skip invalid dates (e.g. malformed frontmatter strings) so they don't
    // silently coerce to NaN and fall through to the default.
    if (Number.isFinite(modDate.getTime())) {
      const daysSinceModified = (Date.now() - modDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceModified < 30) {
        return 'monthly'; // Recently modified content
      } else if (daysSinceModified < 365) {
        return 'yearly'; // Older content
      }
    }
  }

  // Default for most content pages
  return 'yearly';
}
