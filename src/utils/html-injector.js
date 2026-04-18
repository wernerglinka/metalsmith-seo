/**
 * @fileoverview HTML injection utilities for strategic head element placement.
 *
 * Provides two APIs:
 * - Document API (createDocument/serializeDocument + *FromDoc functions): Parse once,
 *   perform all mutations, serialize once. Use this for batch operations on a single file.
 * - String API (updateTitle, updateMetaTag, etc.): Convenience wrappers that parse
 *   and serialize per call. Use for isolated single operations.
 */

import { load } from 'cheerio';
import { escapeHtml } from './escape.js';

/**
 * @typedef {Object} InjectionOptions
 * @property {boolean} [createHead=true] - Whether to create <head> if it doesn't exist
 * @property {boolean} [ensureTitle=true] - Whether to ensure a <title> tag exists
 * @property {string} [position='end'] - Where to inject: 'start', 'end', 'before-title', 'after-title'
 */

/** @type {import('cheerio').CheerioOptions} */
const CHEERIO_OPTIONS = {
  decodeEntities: false,
  lowerCaseAttributeNames: false
};

// ===== Document lifecycle =====

/**
 * Extracts the head section boundaries from an HTML string.
 * Returns the parts needed to reconstruct the document after modifying only the head.
 * @param {string} html - The full HTML string
 * @returns {Object|null} Head section parts, or null if no head tag found
 */
function extractHeadSection(html) {
  const headOpenMatch = html.match(/<head(\s[^>]*)?>/i);
  if (!headOpenMatch) {
    return null;
  }

  const headOpenStart = headOpenMatch.index;
  const headOpenEnd = headOpenStart + headOpenMatch[0].length;

  // Search for </head> after the opening tag
  const afterOpen = html.substring(headOpenEnd);
  const headCloseMatch = afterOpen.match(/<\/head\s*>/i);
  if (!headCloseMatch) {
    return null;
  }

  const headCloseStart = headOpenEnd + headCloseMatch.index;
  const headCloseEnd = headCloseStart + headCloseMatch[0].length;

  return {
    before: html.substring(0, headOpenStart),
    headTag: headOpenMatch[0],
    innerContent: html.substring(headOpenEnd, headCloseStart),
    after: html.substring(headCloseEnd)
  };
}

/**
 * Parses HTML for head-section manipulation.
 * When a head tag is found, only the head section is fed to Cheerio (much faster
 * for large pages). Falls back to full-document parsing when no head tag exists.
 * @param {string} html - The HTML content to parse
 * @returns {import('cheerio').CheerioAPI} Cheerio document instance
 */
export function createDocument(html) {
  const headParts = extractHeadSection(html);

  if (!headParts) {
    // No <head> found — fall back to full-document parsing
    return load(html, CHEERIO_OPTIONS);
  }

  // Parse only the head section (much smaller than full document)
  const $ = load(`${headParts.headTag}${headParts.innerContent}</head>`, CHEERIO_OPTIONS);

  // Attach context for reconstruction in serializeDocument
  $._seoHeadContext = {
    before: headParts.before,
    headTag: headParts.headTag,
    after: headParts.after
  };

  return $;
}

/**
 * Serializes a Cheerio document back to an HTML string.
 * In head-only mode, reconstructs the full document by splicing the modified
 * head back into the original HTML (the body is never parsed or modified).
 * @param {import('cheerio').CheerioAPI} $ - Cheerio document instance
 * @returns {string} HTML string
 */
export function serializeDocument($) {
  const ctx = $._seoHeadContext;
  if (ctx) {
    // Head-only mode: reconstruct from modified head + original body
    const modifiedHeadContent = $('head').html();
    return `${ctx.before}${ctx.headTag}${modifiedHeadContent}</head>${ctx.after}`;
  }
  // Full-document fallback
  return $.html();
}

// ===== Shared helpers =====

/**
 * Ensures a head element exists in the document, creating one if needed
 * @param {import('cheerio').CheerioAPI} $ - Cheerio document instance
 * @returns {import('cheerio').Cheerio} The head element
 */
function ensureHead($) {
  let $head = $('head');
  if ($head.length === 0) {
    $('body').before('<head></head>');
    $head = $('head');
  }
  return $head;
}

// ===== Document-level API (mutate Cheerio instance in place) =====

/**
 * Removes existing SEO meta tags from a Cheerio document
 * @param {import('cheerio').CheerioAPI} $ - Cheerio document instance
 * @param {string[]} [tags] - Specific tags to remove (defaults to all SEO tags)
 */
export function removeTagsFromDoc($, tags = []) {
  const defaultTags = ['description', 'keywords', 'robots', 'canonical'];

  const ogTags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name'];

  const twitterTags = [
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
    'twitter:site',
    'twitter:creator'
  ];

  const tagsToRemove = tags.length > 0 ? tags : [...defaultTags, ...ogTags, ...twitterTags];

  tagsToRemove.forEach((tag) => {
    $(`meta[name="${tag}"]`).remove();
    $(`meta[property="${tag}"]`).remove();
  });

  // Remove existing JSON-LD scripts
  $('script[type="application/ld+json"]').remove();

  // Remove existing canonical link
  $('link[rel="canonical"]').remove();
}

/**
 * Updates or creates the title tag in a Cheerio document
 * @param {import('cheerio').CheerioAPI} $ - Cheerio document instance
 * @param {string} title - The title content
 */
export function setTitleInDoc($, title) {
  const $head = ensureHead($);
  const $title = $head.find('title');
  if ($title.length > 0) {
    $title.text(title);
  } else {
    $head.prepend(`<title>${escapeHtml(title)}</title>`);
  }
}

/**
 * Adds or updates a meta tag in a Cheerio document
 * @param {import('cheerio').CheerioAPI} $ - Cheerio document instance
 * @param {string} name - The meta tag name or property
 * @param {string} content - The meta tag content
 * @param {string} [type='name'] - The attribute type: 'name', 'property', 'http-equiv'
 */
export function setMetaInDoc($, name, content, type = 'name') {
  const $head = ensureHead($);

  // Find existing meta tag
  const selector = `meta[${type}="${name}"]`;
  const $existing = $head.find(selector);

  if ($existing.length > 0) {
    // Update existing meta tag
    $existing.attr('content', content);
  } else {
    // Create new meta tag
    const metaTag = `<meta ${type}="${escapeHtml(name)}" content="${escapeHtml(content)}">`;

    // Insert after existing meta tags but before other elements
    const $lastMeta = $head.find('meta').last();
    if ($lastMeta.length > 0) {
      $lastMeta.after(metaTag);
    } else {
      // Insert after title if it exists, otherwise at the start
      const $title = $head.find('title');
      if ($title.length > 0) {
        $title.after(metaTag);
      } else {
        $head.prepend(metaTag);
      }
    }
  }
}

/**
 * Adds or updates a link tag in a Cheerio document
 * @param {import('cheerio').CheerioAPI} $ - Cheerio document instance
 * @param {string} rel - The link relationship
 * @param {string} href - The link URL
 * @param {Object} [attributes={}] - Additional attributes
 */
export function setLinkInDoc($, rel, href, attributes = {}) {
  const $head = ensureHead($);

  // Find existing link tag
  const $existing = $head.find(`link[rel="${rel}"]`);

  // Build attributes string
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(' ');

  const linkTag = `<link rel="${escapeHtml(rel)}" href="${escapeHtml(href)}"${attrs ? ` ${attrs}` : ''}>`;

  if ($existing.length > 0) {
    // Replace existing link tag
    $existing.replaceWith(linkTag);
  } else {
    // Add new link tag after other links
    const $lastLink = $head.find('link').last();
    if ($lastLink.length > 0) {
      $lastLink.after(linkTag);
    } else {
      // Insert after meta tags
      const $lastMeta = $head.find('meta').last();
      if ($lastMeta.length > 0) {
        $lastMeta.after(linkTag);
      } else {
        $head.append(linkTag);
      }
    }
  }
}

/**
 * Adds a script tag to the head in a Cheerio document
 * @param {import('cheerio').CheerioAPI} $ - Cheerio document instance
 * @param {string} scriptContent - The script content
 * @param {string} [type='application/ld+json'] - The script type
 * @param {string} [position='end'] - Where to place: 'start' or 'end'
 */
export function addScriptToDoc($, scriptContent, type = 'application/ld+json', position = 'end') {
  const $head = ensureHead($);
  const scriptTag = `<script type="${escapeHtml(type)}">${scriptContent}</script>`;

  if (position === 'end') {
    $head.append(scriptTag);
  } else {
    $head.prepend(scriptTag);
  }
}

// ===== String API (convenience wrappers — one parse/serialize cycle per call) =====

/**
 * Injects HTML content into the head section of an HTML document
 * @param {string} html - The HTML content to modify
 * @param {string} content - The content to inject
 * @param {InjectionOptions} [options={}] - Injection options
 * @returns {string} Modified HTML content
 */
export function injectIntoHead(html, content, options = {}) {
  const { createHead = true, ensureTitle = true, position = 'end' } = options;

  // Load HTML with Cheerio
  const $ = load(html, CHEERIO_OPTIONS);

  // Ensure head element exists
  let $head = $('head');
  if ($head.length === 0 && createHead) {
    // Create head if it doesn't exist
    if ($('html').length === 0) {
      // No html element, wrap everything
      $('body').before('<head></head>');
    } else {
      // Add head to existing html element
      $('html').prepend('<head></head>');
    }
    $head = $('head');
  }

  if ($head.length === 0) {
    // Can't inject without a head element
    return html;
  }

  // Ensure title exists if requested
  if (ensureTitle && $head.find('title').length === 0) {
    $head.prepend('<title></title>');
  }

  // Inject content based on position
  switch (position) {
    case 'start':
      $head.prepend(content);
      break;

    case 'before-title': {
      const $title = $head.find('title').first();
      if ($title.length > 0) {
        $title.before(content);
      } else {
        $head.prepend(content);
      }
      break;
    }

    case 'after-title': {
      const $titleAfter = $head.find('title').first();
      if ($titleAfter.length > 0) {
        $titleAfter.after(content);
      } else {
        $head.append(content);
      }
      break;
    }

    case 'end':
    default:
      $head.append(content);
      break;
  }

  return $.html();
}

/**
 * Updates or creates the title tag
 * @param {string} html - The HTML content to modify
 * @param {string} title - The title content
 * @returns {string} Modified HTML content
 */
export function updateTitle(html, title) {
  const $ = createDocument(html);
  setTitleInDoc($, title);
  return serializeDocument($);
}

/**
 * Adds or updates a meta tag
 * @param {string} html - The HTML content to modify
 * @param {string} name - The meta tag name or property
 * @param {string} content - The meta tag content
 * @param {string} [type='name'] - The attribute type: 'name', 'property', 'http-equiv'
 * @returns {string} Modified HTML content
 */
export function updateMetaTag(html, name, content, type = 'name') {
  const $ = createDocument(html);
  setMetaInDoc($, name, content, type);
  return serializeDocument($);
}

/**
 * Adds or updates a link tag
 * @param {string} html - The HTML content to modify
 * @param {string} rel - The link relationship
 * @param {string} href - The link URL
 * @param {Object} [attributes={}] - Additional attributes
 * @returns {string} Modified HTML content
 */
export function updateLinkTag(html, rel, href, attributes = {}) {
  const $ = createDocument(html);
  setLinkInDoc($, rel, href, attributes);
  return serializeDocument($);
}

/**
 * Adds a script tag to the head (for JSON-LD structured data)
 * @param {string} html - The HTML content to modify
 * @param {string} scriptContent - The script content
 * @param {string} [type='application/ld+json'] - The script type
 * @param {string} [position='end'] - Where to place the script
 * @returns {string} Modified HTML content
 */
export function addScript(html, scriptContent, type = 'application/ld+json', position = 'end') {
  const $ = createDocument(html);
  addScriptToDoc($, scriptContent, type, position);
  return serializeDocument($);
}

/**
 * Removes existing SEO meta tags (for clean injection)
 * @param {string} html - The HTML content to modify
 * @param {string[]} [tags] - Specific tags to remove
 * @returns {string} Modified HTML content
 */
export function removeExistingMetaTags(html, tags = []) {
  const $ = createDocument(html);
  removeTagsFromDoc($, tags);
  return serializeDocument($);
}
