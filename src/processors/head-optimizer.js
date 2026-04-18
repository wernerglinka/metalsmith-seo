/**
 * @fileoverview Unified head optimizer that orchestrates all SEO metadata generation.
 */

import { extractMetadata } from './metadata-extractor.js';
import { generateMetaTags } from '../generators/meta-generator.js';
import { generateOpenGraphTags } from '../generators/opengraph-generator.js';
import { generateTwitterCardTags } from '../generators/twitter-generator.js';
import { generateJsonLd } from '../generators/jsonld-generator.js';
import {
  createDocument,
  serializeDocument,
  removeTagsFromDoc,
  setTitleInDoc,
  setMetaInDoc,
  setLinkInDoc,
  addScriptToDoc
} from '../utils/html-injector.js';

/**
 * @typedef {Object} HeadOptimizationOptions
 * @property {string} hostname - Base hostname for generating URLs
 * @property {string} [seoProperty='seo'] - Frontmatter property containing SEO data
 * @property {Object} [defaults] - Default values for missing metadata
 * @property {Object} [fallbacks] - Fallback property mappings
 * @property {Object} [social] - Social media configuration
 * @property {Object} [jsonLd] - JSON-LD configuration
 * @property {boolean} [cleanExisting=true] - Remove existing SEO tags before injection
 * @property {boolean} [generateSitemap=true] - Whether to include files in sitemap
 * @property {number} [wordsPerMinute=200] - Reading speed for calculating reading time
 */

/**
 * @typedef {Object} OptimizationResult
 * @property {string} html - Modified HTML content
 * @property {Object} metadata - Extracted metadata
 * @property {Object} generated - Generated SEO content
 */

/**
 * Processes a file and optimizes its head section with SEO metadata
 * @param {string} filePath - File path relative to source
 * @param {Object} frontmatter - File frontmatter and content
 * @param {HeadOptimizationOptions} options - Optimization options
 * @returns {OptimizationResult} Optimization result
 */
export async function optimizeHead(filePath, frontmatter, options) {
  const {
    hostname,
    seoProperty = 'seo',
    defaults = {},
    fallbacks = {},
    social = {},
    jsonLd = {},
    cleanExisting = true,
    generateSitemap = true,
    wordsPerMinute = 200
  } = options;

  // Skip non-HTML files
  if (!isHtmlFile(filePath) || !Buffer.isBuffer(frontmatter.contents)) {
    return {
      html: frontmatter.contents.toString(),
      metadata: null,
      generated: null
    };
  }

  // Extract unified metadata
  const metadata = extractMetadata(filePath, frontmatter, {
    hostname,
    seoProperty,
    defaults,
    fallbacks,
    wordsPerMinute
  });

  // Check if file should be excluded from SEO processing
  if (metadata.noIndex && !generateSitemap) {
    return {
      html: frontmatter.contents.toString(),
      metadata,
      generated: null
    };
  }

  // Generate all SEO content
  const generated = await generateAllSeoContent(metadata, {
    hostname,
    social,
    jsonLd,
    filePath
  });

  // Inject SEO content into HTML
  let html = frontmatter.contents.toString();
  html = await injectSeoContent(html, metadata, generated, { cleanExisting });

  return {
    html,
    metadata,
    generated
  };
}

/**
 * Generates all SEO content from metadata
 * @param {Object} metadata - Extracted metadata
 * @param {Object} config - Generation configuration
 * @returns {Object} Generated SEO content
 */
function generateAllSeoContent(metadata, config) {
  const { hostname, social, jsonLd, filePath } = config;

  // Site configuration combining hostname with social/jsonLd configs
  const siteConfig = {
    hostname,
    ...social,
    ...jsonLd
  };

  // Generate meta tags
  const metaResult = generateMetaTags(metadata, siteConfig);

  // Generate Open Graph tags
  const ogResult = generateOpenGraphTags(metadata, siteConfig);

  // Generate Twitter Card tags
  const twitterResult = generateTwitterCardTags(metadata, siteConfig);

  // Generate JSON-LD structured data
  const jsonLdResult = generateJsonLd(metadata, siteConfig, filePath);

  return {
    meta: metaResult,
    openGraph: ogResult,
    twitter: twitterResult,
    jsonLd: jsonLdResult
  };
}

/**
 * Injects SEO content into HTML head section using single-pass processing.
 * Parses HTML once, performs all DOM mutations, serializes once.
 * @param {string} html - Original HTML content
 * @param {Object} metadata - Extracted metadata
 * @param {Object} generated - Generated SEO content
 * @param {Object} options - Injection options
 * @returns {string} Modified HTML content
 */
function injectSeoContent(html, metadata, generated, options = {}) {
  const { cleanExisting = true } = options;

  // Parse HTML once
  const $ = createDocument(html);

  // Clean existing SEO tags if requested
  if (cleanExisting) {
    removeTagsFromDoc($);
  }

  // Update title tag
  if (metadata.title) {
    setTitleInDoc($, metadata.title);
  }

  // Inject meta tags (critical tags first)
  const criticalMetaTags = getCriticalMetaTags(generated.meta.metaTags);
  const otherMetaTags = getOtherMetaTags(generated.meta.metaTags);

  // Inject critical meta tags early
  for (const tag of criticalMetaTags) {
    if (tag.name) {
      setMetaInDoc($, tag.name, tag.content, 'name');
    } else if (tag.httpEquiv) {
      setMetaInDoc($, tag.httpEquiv, tag.content, 'http-equiv');
    }
  }

  // Inject link tags (after critical meta tags)
  for (const link of generated.meta.linkTags) {
    setLinkInDoc(
      $,
      link.rel,
      link.href,
      Object.fromEntries(Object.entries(link).filter(([key]) => !['rel', 'href'].includes(key)))
    );
  }

  // Inject remaining meta tags
  for (const tag of otherMetaTags) {
    if (tag.name) {
      setMetaInDoc($, tag.name, tag.content, 'name');
    }
  }

  // Inject Open Graph tags
  for (const tag of generated.openGraph.metaTags) {
    setMetaInDoc($, tag.property, tag.content, 'property');
  }

  // Inject Twitter Card tags
  for (const tag of generated.twitter.metaTags) {
    setMetaInDoc($, tag.name, tag.content, 'name');
  }

  // Inject JSON-LD structured data (at the end for optimal loading).
  // The generator returns the already-escaped JSON in `json`; the injector
  // wraps it in <script type="application/ld+json">. Surrounding newlines
  // keep the rendered HTML readable when the script is appended in-line.
  if (generated.jsonLd.json) {
    addScriptToDoc($, `\n${generated.jsonLd.json}\n`, 'application/ld+json', 'end');
  }

  // Serialize once
  return serializeDocument($);
}

/**
 * Determines critical meta tags that should be injected early
 * @param {Array} metaTags - All meta tags
 * @returns {Array} Critical meta tags
 */
function getCriticalMetaTags(metaTags) {
  const criticalTags = ['viewport', 'charset', 'description', 'robots'];

  return metaTags.filter((tag) => criticalTags.includes(tag.name) || criticalTags.includes(tag.httpEquiv));
}

/**
 * Gets non-critical meta tags
 * @param {Array} metaTags - All meta tags
 * @returns {Array} Non-critical meta tags
 */
function getOtherMetaTags(metaTags) {
  const criticalTags = ['viewport', 'charset', 'description', 'robots'];

  return metaTags.filter((tag) => !criticalTags.includes(tag.name) && !criticalTags.includes(tag.httpEquiv));
}

/**
 * Checks if a file is an HTML file that should be processed
 * @param {string} filePath - File path
 * @returns {boolean} Whether file should be processed
 */
function isHtmlFile(filePath) {
  return /\.html?$/i.test(filePath);
}

/**
 * Batch processes multiple files for SEO optimization
 * @param {Object} files - Metalsmith files object
 * @param {HeadOptimizationOptions} options - Optimization options
 * @returns {Promise<Object>} Results for each processed file
 */
export async function batchOptimizeHeads(files, options) {
  const results = {};
  const errors = [];
  const fileList = Object.keys(files);

  // Process files in parallel batches
  const batchSize = options.batchSize || 10;

  for (let i = 0; i < fileList.length; i += batchSize) {
    const batch = fileList.slice(i, i + batchSize);

    const batchPromises = batch.map(async (filePath) => {
      try {
        const result = await optimizeHead(filePath, files[filePath], options);

        // Update file contents if HTML was modified
        if (result.html !== files[filePath].contents.toString()) {
          files[filePath].contents = Buffer.from(result.html);
        }

        // Store metadata for potential use by other plugins
        if (result.metadata) {
          files[filePath].seoMetadata = result.metadata;
        }

        return { filePath, result };
      } catch (error) {
        return { filePath, error };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach(({ filePath, result, error }) => {
      if (error) {
        errors.push({ filePath, error });
        results[filePath] = { error };
      } else {
        results[filePath] = result;
      }
    });
  }

  // Surface failures to Metalsmith instead of silently logging — a build
  // that produces broken SEO output should not be reported as successful.
  // We collect across the whole pass so the user sees every failing file
  // in one go rather than fixing one and discovering the next on rebuild.
  if (errors.length > 0) {
    throw aggregateOptimizationError(errors, 'SEO optimization');
  }

  return results;
}

/**
 * Builds a single Error summarizing per-file failures. Uses AggregateError
 * when more than one file failed so callers can introspect the originals.
 * @param {Array<{filePath: string, error: Error}>} errors - Per-file errors
 * @param {string} stage - Human-readable stage name for the message
 * @returns {Error} Aggregate error suitable for Metalsmith's done callback
 */
function aggregateOptimizationError(errors, stage) {
  const summary = errors.map(({ filePath, error }) => `  - ${filePath}: ${error.message}`).join('\n');
  const message = `[metalsmith-seo] ${stage} failed for ${errors.length} file(s):\n${summary}`;

  if (errors.length === 1) {
    const wrapped = new Error(message);
    wrapped.cause = errors[0].error;
    return wrapped;
  }

  return new AggregateError(
    errors.map((e) => e.error),
    message
  );
}

/**
 * Extracts SEO metadata from files without modifying HTML (for sitemap generation)
 * @param {Object} files - Metalsmith files object
 * @param {HeadOptimizationOptions} options - Extraction options
 * @returns {Object} Extracted metadata for each file
 */
export function extractAllMetadata(files, options) {
  const metadata = {};
  const errors = [];

  Object.keys(files).forEach((filePath) => {
    try {
      metadata[filePath] = extractMetadata(filePath, files[filePath], options);
    } catch (error) {
      errors.push({ filePath, error });
      metadata[filePath] = { error };
    }
  });

  if (errors.length > 0) {
    throw aggregateOptimizationError(errors, 'Metadata extraction');
  }

  return metadata;
}

/**
 * Validates SEO configuration
 * @param {HeadOptimizationOptions} options - Options to validate
 * @returns {Array} Array of validation errors
 */
export function validateSeoConfig(options) {
  const errors = [];

  if (!options.hostname) {
    errors.push('hostname is required');
  }

  if (options.hostname && !isValidUrl(options.hostname)) {
    errors.push('hostname must be a valid URL');
  }

  if (options.social?.twitterSite && !options.social.twitterSite.startsWith('@')) {
    errors.push('social.twitterSite should start with @');
  }

  if (options.jsonLd?.organization && !options.jsonLd.organization.name) {
    errors.push('jsonLd.organization.name is required when organization is specified');
  }

  return errors;
}

/**
 * Validates if a string is a valid URL
 * @param {string} str - String to validate
 * @returns {boolean} Whether string is valid URL
 */
function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}
