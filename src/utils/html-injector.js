/**
 * @fileoverview HTML injection utilities for strategic head element placement.
 */

import { load } from 'cheerio';

/**
 * @typedef {Object} InjectionOptions
 * @property {boolean} [createHead=true] - Whether to create <head> if it doesn't exist
 * @property {boolean} [ensureTitle=true] - Whether to ensure a <title> tag exists
 * @property {string} [position='end'] - Where to inject: 'start', 'end', 'before-title', 'after-title'
 */

/**
 * Injects HTML content into the head section of an HTML document
 * @param {string} html - The HTML content to modify
 * @param {string} content - The content to inject
 * @param {InjectionOptions} [options={}] - Injection options
 * @returns {string} Modified HTML content
 */
export function injectIntoHead(html, content, options = {}) {
  const {
    createHead = true,
    ensureTitle = true,
    position = 'end'
  } = options;

  // Load HTML with Cheerio
  const $ = load(html, {
    decodeEntities: false,
    lowerCaseAttributeNames: false
  });

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
      
    case 'before-title':
      const $title = $head.find('title').first();
      if ($title.length > 0) {
        $title.before(content);
      } else {
        $head.prepend(content);
      }
      break;
      
    case 'after-title':
      const $titleAfter = $head.find('title').first();
      if ($titleAfter.length > 0) {
        $titleAfter.after(content);
      } else {
        $head.append(content);
      }
      break;
      
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
  const $ = load(html, {
    decodeEntities: false,
    lowerCaseAttributeNames: false
  });

  let $head = $('head');
  if ($head.length === 0) {
    $('body').before('<head></head>');
    $head = $('head');
  }

  const $title = $head.find('title');
  if ($title.length > 0) {
    $title.text(title);
  } else {
    $head.prepend(`<title>${escapeHtml(title)}</title>`);
  }

  return $.html();
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
  const $ = load(html, {
    decodeEntities: false,
    lowerCaseAttributeNames: false
  });

  let $head = $('head');
  if ($head.length === 0) {
    $('body').before('<head></head>');
    $head = $('head');
  }

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

  return $.html();
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
  const $ = load(html, {
    decodeEntities: false,
    lowerCaseAttributeNames: false
  });

  let $head = $('head');
  if ($head.length === 0) {
    $('body').before('<head></head>');
    $head = $('head');
  }

  // Find existing link tag
  const $existing = $head.find(`link[rel="${rel}"]`);

  // Build attributes string
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(' ');

  const linkTag = `<link rel="${escapeHtml(rel)}" href="${escapeHtml(href)}"${attrs ? ' ' + attrs : ''}>`;

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

  return $.html();
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
  const $ = load(html, {
    decodeEntities: false,
    lowerCaseAttributeNames: false
  });

  let $head = $('head');
  if ($head.length === 0) {
    $('body').before('<head></head>');
    $head = $('head');
  }

  const scriptTag = `<script type="${escapeHtml(type)}">${scriptContent}</script>`;

  if (position === 'end') {
    $head.append(scriptTag);
  } else {
    $head.prepend(scriptTag);
  }

  return $.html();
}

/**
 * Escapes HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (typeof str !== 'string') {
    return String(str);
  }
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Removes existing SEO meta tags (for clean injection)
 * @param {string} html - The HTML content to modify
 * @param {string[]} [tags] - Specific tags to remove
 * @returns {string} Modified HTML content
 */
export function removeExistingMetaTags(html, tags = []) {
  const $ = load(html, {
    decodeEntities: false,
    lowerCaseAttributeNames: false
  });

  const defaultTags = [
    'description',
    'keywords',
    'robots',
    'canonical'
  ];

  const ogTags = [
    'og:title',
    'og:description', 
    'og:image',
    'og:url',
    'og:type',
    'og:site_name'
  ];

  const twitterTags = [
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
    'twitter:site',
    'twitter:creator'
  ];

  const tagsToRemove = tags.length > 0 ? tags : [...defaultTags, ...ogTags, ...twitterTags];

  tagsToRemove.forEach(tag => {
    $(`meta[name="${tag}"]`).remove();
    $(`meta[property="${tag}"]`).remove();
  });

  // Remove existing JSON-LD scripts
  $('script[type="application/ld+json"]').remove();

  // Remove existing canonical link
  $('link[rel="canonical"]').remove();

  return $.html();
}