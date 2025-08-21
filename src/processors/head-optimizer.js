/**
 * @fileoverview Unified head optimizer that orchestrates all SEO metadata generation.
 */

import { extractMetadata } from './metadata-extractor.js';
import { generateMetaTags, metaTagsToHtml, linkTagsToHtml } from '../generators/meta-generator.js';
import { generateOpenGraphTags, openGraphTagsToHtml } from '../generators/opengraph-generator.js';
import { generateTwitterCardTags, twitterCardTagsToHtml } from '../generators/twitter-generator.js';
import { generateJsonLd } from '../generators/jsonld-generator.js';
import { 
  injectIntoHead, 
  updateTitle, 
  updateMetaTag, 
  updateLinkTag, 
  addScript,
  removeExistingMetaTags 
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
    generateSitemap = true
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
    fallbacks
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
async function generateAllSeoContent(metadata, config) {
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
 * Injects SEO content into HTML head section
 * @param {string} html - Original HTML content
 * @param {Object} metadata - Extracted metadata
 * @param {Object} generated - Generated SEO content
 * @param {Object} options - Injection options
 * @returns {string} Modified HTML content
 */
async function injectSeoContent(html, metadata, generated, options = {}) {
  const { cleanExisting = true } = options;
  
  let modifiedHtml = html;

  // Clean existing SEO tags if requested
  if (cleanExisting) {
    modifiedHtml = removeExistingMetaTags(modifiedHtml);
  }

  // Update title tag
  if (metadata.title) {
    modifiedHtml = updateTitle(modifiedHtml, metadata.title);
  }

  // Inject meta tags (critical tags first)
  const criticalMetaTags = getCriticalMetaTags(generated.meta.metaTags);
  const otherMetaTags = getOtherMetaTags(generated.meta.metaTags);

  // Inject critical meta tags early
  for (const tag of criticalMetaTags) {
    if (tag.name) {
      modifiedHtml = updateMetaTag(modifiedHtml, tag.name, tag.content, 'name');
    } else if (tag.httpEquiv) {
      modifiedHtml = updateMetaTag(modifiedHtml, tag.httpEquiv, tag.content, 'http-equiv');
    }
  }

  // Inject link tags (after critical meta tags)
  for (const link of generated.meta.linkTags) {
    modifiedHtml = updateLinkTag(modifiedHtml, link.rel, link.href, 
      Object.fromEntries(Object.entries(link).filter(([key]) => !['rel', 'href'].includes(key)))
    );
  }

  // Inject remaining meta tags
  for (const tag of otherMetaTags) {
    if (tag.name) {
      modifiedHtml = updateMetaTag(modifiedHtml, tag.name, tag.content, 'name');
    }
  }

  // Inject Open Graph tags
  for (const tag of generated.openGraph.metaTags) {
    modifiedHtml = updateMetaTag(modifiedHtml, tag.property, tag.content, 'property');
  }

  // Inject Twitter Card tags
  for (const tag of generated.twitter.metaTags) {
    modifiedHtml = updateMetaTag(modifiedHtml, tag.name, tag.content, 'name');
  }

  // Inject JSON-LD structured data (at the end for optimal loading)
  if (generated.jsonLd.html) {
    const jsonLdContent = generated.jsonLd.html.replace(/<script[^>]*>|<\/script>/g, '');
    modifiedHtml = addScript(modifiedHtml, jsonLdContent, 'application/ld+json', 'end');
  }

  return modifiedHtml;
}

/**
 * Determines critical meta tags that should be injected early
 * @param {Array} metaTags - All meta tags
 * @returns {Array} Critical meta tags
 */
function getCriticalMetaTags(metaTags) {
  const criticalTags = ['viewport', 'charset', 'description', 'robots'];
  
  return metaTags.filter(tag => 
    criticalTags.includes(tag.name) || 
    criticalTags.includes(tag.httpEquiv)
  );
}

/**
 * Gets non-critical meta tags
 * @param {Array} metaTags - All meta tags
 * @returns {Array} Non-critical meta tags
 */
function getOtherMetaTags(metaTags) {
  const criticalTags = ['viewport', 'charset', 'description', 'robots'];
  
  return metaTags.filter(tag => 
    !criticalTags.includes(tag.name) && 
    !criticalTags.includes(tag.httpEquiv)
  );
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
        console.error(`SEO optimization failed for ${filePath}:`, error);
        return { filePath, error };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    
    // Collect results
    batchResults.forEach(({ filePath, result, error }) => {
      results[filePath] = error ? { error } : result;
    });
  }

  return results;
}

/**
 * Extracts SEO metadata from files without modifying HTML (for sitemap generation)
 * @param {Object} files - Metalsmith files object
 * @param {HeadOptimizationOptions} options - Extraction options
 * @returns {Object} Extracted metadata for each file
 */
export function extractAllMetadata(files, options) {
  const metadata = {};
  
  Object.keys(files).forEach(filePath => {
    try {
      const extracted = extractMetadata(filePath, files[filePath], options);
      metadata[filePath] = extracted;
    } catch (error) {
      console.error(`Metadata extraction failed for ${filePath}:`, error);
      metadata[filePath] = { error };
    }
  });

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