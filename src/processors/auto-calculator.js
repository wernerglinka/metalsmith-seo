/**
 * @fileoverview Automatic priority and changefreq calculation utilities.
 */

import path from "path";
import { get } from "../utils/object-utils.js";

/**
 * Calculates automatic priority based on content analysis.
 * @param {string} file - File path relative to source directory
 * @param {Object} frontmatter - File metadata and frontmatter
 * @param {Object} options - Calculation options
 * @param {string} options.modifiedProperty - Property name to read last modified date from file metadata
 * @param {Date|string} options.lastmod - Default last modified date
 * @returns {number} Calculated priority between 0.1 and 1.0
 */
export function calculatePriority(file, frontmatter, options) {
  const { modifiedProperty, lastmod } = options;
  let calculatedPriority = 0.5; // Base priority

  // Path depth analysis (shallower = higher priority)
  const pathDepth = file.split(path.sep).length;
  if (pathDepth === 1) {
    calculatedPriority += 0.3; // Root level files
  } else if (pathDepth === 2) {
    calculatedPriority += 0.2; // One level deep
  } else if (pathDepth === 3) {
    calculatedPriority += 0.1; // Two levels deep
  }
  // Deeper files keep base priority

  // Content type analysis based on path patterns
  const lowerFile = file.toLowerCase();
  if (lowerFile.includes('/blog/') || lowerFile.includes('/news/') || lowerFile.includes('/articles/')) {
    calculatedPriority += 0.1; // Blog content gets boost
  }
  if (lowerFile.includes('/services/') || lowerFile.includes('/products/')) {
    calculatedPriority += 0.2; // Service/product pages get higher boost
  }
  if (lowerFile.includes('index.html') && pathDepth <= 2) {
    calculatedPriority += 0.2; // Index pages are important
  }
  if (lowerFile.includes('/about') || lowerFile.includes('/contact')) {
    calculatedPriority += 0.15; // About/contact pages
  }

  // Content age analysis (if lastmod is available)
  const fileLastmod = get(frontmatter, modifiedProperty) || lastmod;
  if (fileLastmod) {
    const modDate = fileLastmod instanceof Date ? fileLastmod : new Date(fileLastmod);
    const now = new Date();
    const daysSinceModified = (now - modDate) / (1000 * 60 * 60 * 24);
    
    if (daysSinceModified < 30) {
      calculatedPriority += 0.1; // Recently modified content
    } else if (daysSinceModified < 90) {
      calculatedPriority += 0.05; // Moderately recent content
    }
    // Older content gets no bonus
  }

  // Content length analysis (if contents available)
  if (Buffer.isBuffer(frontmatter.contents)) {
    const contentLength = frontmatter.contents.length;
    if (contentLength > 5000) {
      calculatedPriority += 0.05; // Substantial content gets small boost
    }
  }

  // Ensure priority stays within valid range
  return Math.min(Math.max(calculatedPriority, 0.1), 1.0);
}

/**
 * Calculates automatic change frequency based on content analysis.
 * @param {string} file - File path relative to source directory
 * @param {Object} frontmatter - File metadata and frontmatter
 * @param {Object} options - Calculation options
 * @param {string} options.modifiedProperty - Property name to read last modified date from file metadata
 * @param {Date|string} options.lastmod - Default last modified date
 * @returns {string} Calculated change frequency
 */
export function calculateChangefreq(file, frontmatter, options) {
  const { modifiedProperty, lastmod } = options;
  const lowerFile = file.toLowerCase();

  // Blog and news content changes frequently
  if (lowerFile.includes('/blog/') || lowerFile.includes('/news/') || lowerFile.includes('/articles/')) {
    return 'weekly';
  }

  // Index pages and category pages update when new content is added
  if (lowerFile.includes('index.html')) {
    if (lowerFile.includes('/blog/') || lowerFile.includes('/news/')) {
      return 'weekly'; // Blog index updates frequently
    }
    return 'monthly'; // Other index pages update less frequently
  }

  // Service and product pages update occasionally
  if (lowerFile.includes('/services/') || lowerFile.includes('/products/')) {
    return 'monthly';
  }

  // About, contact, and policy pages rarely change
  if (lowerFile.includes('/about') || lowerFile.includes('/contact') || 
      lowerFile.includes('/privacy') || lowerFile.includes('/terms')) {
    return 'yearly';
  }

  // Documentation might update occasionally
  if (lowerFile.includes('/docs/') || lowerFile.includes('/documentation/')) {
    return 'monthly';
  }

  // Check content age if available
  const fileLastmod = get(frontmatter, modifiedProperty) || lastmod;
  if (fileLastmod) {
    const modDate = fileLastmod instanceof Date ? fileLastmod : new Date(fileLastmod);
    const now = new Date();
    const daysSinceModified = (now - modDate) / (1000 * 60 * 60 * 24);
    
    if (daysSinceModified < 7) {
      return 'weekly'; // Recently modified
    } else if (daysSinceModified < 30) {
      return 'monthly'; // Modified in last month
    } else if (daysSinceModified < 365) {
      return 'yearly'; // Modified in last year
    }
  }

  // Default for unclassified content
  return 'monthly';
}