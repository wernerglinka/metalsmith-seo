/**
 * @fileoverview llms.txt and llms-full.txt generator.
 *
 * Emits files designed for large language models to discover and consume
 * site content. Follows the llmstxt.org proposal:
 *
 *   /llms.txt       curated markdown index of indexable pages
 *   /llms-full.txt  optional concatenated plain-text dump of every page
 *
 * Pages are filtered with the same rules the sitemap uses (`pattern`,
 * `privateProperty`), so anything excluded from the sitemap is also excluded
 * here. Groups come from Metalsmith collections metadata when available, or
 * from an explicit `groups` map in options.
 *
 * When `perLocale: true`, one file pair is emitted per locale (detected from
 * `files[file].locale` or from the leading path segment when `locales` is
 * provided). Default output is a single pair at the hostname root.
 */

import path from 'path';
import { load } from 'cheerio';
import { get } from '../utils/object-utils.js';

/**
 * @typedef {Object} LlmsOptions
 * @property {boolean} [enabled=false] - Emit llms.txt / llms-full.txt
 * @property {string} [output='llms.txt'] - Filename for the index
 * @property {boolean} [fullText=false] - Also emit the concatenated dump
 * @property {string} [fullTextOutput='llms-full.txt'] - Filename for the dump
 * @property {string} [title] - H1 for llms.txt (defaults to siteName)
 * @property {string} [description] - Blockquote description (defaults to site description)
 * @property {string} [details] - Extra markdown block after the description
 * @property {string} [pattern='**\/*.html'] - File match pattern
 * @property {string} [privateProperty='private'] - Property name to exclude
 * @property {Object<string,string>} [groups] - Optional group name -> glob pattern
 * @property {boolean} [perLocale=false] - Emit one file pair per locale
 * @property {Array<string>} [locales] - Known locales for path-prefix detection
 * @property {string} [defaultLocale] - Locale whose files emit at the site
 *   root (`/llms.txt`) instead of under a locale prefix. Defaults to the
 *   plugin's resolved `social.locale`. Set to `''` to disable root emission
 *   and keep every locale under its own prefix.
 * @property {'date-desc'|'date-asc'|'alpha'} [sort='date-desc'] - Entry sort order
 */

// Tags whose closing produces a line break in the extracted plaintext.
const BLOCK_TAGS = new Set([
  'p',
  'div',
  'section',
  'article',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'tr',
  'blockquote',
  'pre'
]);

/**
 * Minimal HTML -> plaintext for llms-full.txt. Not a perfect renderer; the
 * goal is readable prose without scripts, styles, or tag clutter. Uses the
 * cheerio parser already required by the rest of the plugin so we don't have
 * to maintain a second HTML tokenizer (and don't risk regex backtracking on
 * malformed input).
 * @param {string} html - HTML input
 * @returns {string} Normalized plaintext
 */
function htmlToText(html) {
  if (typeof html !== 'string' || html === '') {
    return '';
  }

  const $ = load(html, { decodeEntities: true });

  // Strip site chrome and non-content nodes outright.
  $('head, script, style, svg, noscript').remove();
  // Comments are not selectable by tag — walk and drop.
  $('*')
    .contents()
    .each((_, node) => {
      if (node.type === 'comment') {
        $(node).remove();
      }
    });
  $('br').replaceWith('\n');

  // Prefer <main>/<article> when present so we skip header/nav/footer.
  let $region = $('main, article').first();
  if ($region.length === 0) {
    $region = $('body');
  }
  if ($region.length === 0) {
    $region = $.root();
  }

  // Insert a newline after each block-level closing tag so paragraphs and
  // headings don't collapse into one another when text() concatenates.
  $region.find('*').each((_, el) => {
    if (BLOCK_TAGS.has(el.tagName)) {
      $(el).append('\n');
    }
  });

  return $region
    .text()
    .replace(/[ \t]+/g, ' ')
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * First sentence or ~200 chars of plaintext, for description fallback.
 * @param {string} text - Plain text
 * @returns {string} Short excerpt
 */
function firstSentence(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }
  const match = trimmed.match(/^[^.!?\n]{10,200}[.!?]/);
  if (match) {
    return match[0].trim();
  }
  return trimmed.slice(0, 200).trim();
}

/**
 * Resolve the best title for a page.
 * @param {Object} frontmatter - File frontmatter
 * @param {string} seoProperty - SEO property name
 * @returns {string} Title
 */
function resolveTitle(frontmatter, seoProperty) {
  return get(frontmatter, `${seoProperty}.title`) || get(frontmatter, 'card.title') || frontmatter.title || '';
}

/**
 * Resolve the best description for a page.
 * @param {Object} frontmatter - File frontmatter
 * @param {string} seoProperty - SEO property name
 * @param {string} plaintext - Precomputed plaintext body
 * @returns {string} Description
 */
function resolveDescription(frontmatter, seoProperty, plaintext) {
  return (
    get(frontmatter, `${seoProperty}.description`) ||
    get(frontmatter, 'card.description') ||
    frontmatter.description ||
    frontmatter.excerpt ||
    firstSentence(plaintext || '')
  );
}

/**
 * Parse a date-ish value into a Date, or null.
 * @param {*} value - Date, string, or undefined
 * @returns {Date|null} Parsed date or null
 */
function toDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Detect locale for a file. Prefers explicit metadata set by
 * metalsmith-multilingual; falls back to matching the leading path segment
 * against the configured `locales` list.
 * @param {string} file - File path
 * @param {Object} frontmatter - File frontmatter
 * @param {Array<string>} locales - Known locales
 * @returns {string} Locale id or empty string if unknown/default
 */
function detectLocale(file, frontmatter, locales) {
  if (frontmatter.locale && typeof frontmatter.locale === 'string') {
    return frontmatter.locale;
  }
  if (Array.isArray(locales) && locales.length > 0) {
    const first = file.split(/[\\/]/)[0];
    if (locales.includes(first)) {
      return first;
    }
  }
  return '';
}

/**
 * Pick the group name for a file. Uses an explicit `groups` map first, then
 * falls back to the first Metalsmith collection the file belongs to, then
 * to the top-level directory as a last resort.
 * @param {string} file - File path
 * @param {Object} frontmatter - File frontmatter
 * @param {Object} metalsmith - Metalsmith instance
 * @param {Object<string,string>} groupsOption - Configured group patterns
 * @returns {string} Group name
 */
function pickGroup(file, frontmatter, metalsmith, groupsOption) {
  if (groupsOption) {
    for (const [name, pattern] of Object.entries(groupsOption)) {
      const matched = metalsmith.match(pattern, file);
      if (matched && matched.length > 0) {
        return name;
      }
    }
  }
  const collections = Array.isArray(frontmatter.collection)
    ? frontmatter.collection
    : frontmatter.collection
      ? [frontmatter.collection]
      : [];
  if (collections.length > 0) {
    return String(collections[0]);
  }
  const parts = file.split(/[\\/]/).filter(Boolean);
  return parts[0] || 'Pages';
}

/**
 * Build the absolute URL for a page, honoring canonical overrides.
 * @param {string} file - File path
 * @param {Object} frontmatter - File frontmatter
 * @param {string} hostname - Site hostname
 * @returns {string} Absolute URL
 */
function buildPageUrl(file, frontmatter, hostname) {
  const canonical = frontmatter.canonical;
  if (typeof canonical === 'string' && canonical) {
    return canonical;
  }
  const base = String(hostname || '').replace(/\/$/, '');
  let url = file.replace(/\\/g, '/');
  if (url.endsWith('/index.html')) {
    url = url.slice(0, -'index.html'.length);
  }
  return `${base}/${url}`;
}

/**
 * Collect every page eligible for inclusion, with resolved metadata.
 * @param {Object} files - Metalsmith files object
 * @param {Object} metalsmith - Metalsmith instance
 * @param {Object} options - Resolved llms options
 * @param {string} options.pattern - Match pattern
 * @param {string} options.privateProperty - Private flag property
 * @param {string} options.seoProperty - SEO property name
 * @param {string} options.hostname - Site hostname
 * @param {Object<string,string>} [options.groups] - Group patterns
 * @param {Array<string>} [options.locales] - Known locales
 * @returns {Array<Object>} Page entries
 */
function collectEntries(files, metalsmith, options) {
  const { pattern, privateProperty, seoProperty, hostname, groups, locales } = options;
  const entries = [];
  for (const file of Object.keys(files)) {
    const frontmatter = files[file];
    if (!Buffer.isBuffer(frontmatter.contents)) {
      continue;
    }
    const matched = metalsmith.match(pattern, file);
    if (!matched || matched.length === 0) {
      continue;
    }
    if (get(frontmatter, privateProperty)) {
      continue;
    }

    const html = frontmatter.contents.toString('utf-8');
    const plaintext = htmlToText(html);
    const title = resolveTitle(frontmatter, seoProperty) || path.basename(file);
    const description = resolveDescription(frontmatter, seoProperty, plaintext);
    const url = buildPageUrl(file, frontmatter, hostname);
    const group = pickGroup(file, frontmatter, metalsmith, groups);
    const locale = detectLocale(file, frontmatter, locales);
    const date = toDate(frontmatter.date || frontmatter.lastmod);

    entries.push({
      file,
      title,
      description,
      url,
      group,
      locale,
      date,
      plaintext
    });
  }
  return entries;
}

/**
 * Sort entries in-place per the configured strategy.
 * @param {Array<Object>} entries - Entries to sort
 * @param {string} sort - Sort strategy
 * @returns {Array<Object>} The same array, sorted
 */
function sortEntries(entries, sort) {
  const byDateDesc = (a, b) => {
    if (a.date && b.date) {
      return b.date.getTime() - a.date.getTime();
    }
    if (a.date) {
      return -1;
    }
    if (b.date) {
      return 1;
    }
    return a.title.localeCompare(b.title);
  };
  if (sort === 'date-asc') {
    entries.sort((a, b) => -byDateDesc(a, b));
  } else if (sort === 'alpha') {
    entries.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    entries.sort(byDateDesc);
  }
  return entries;
}

/**
 * Group entries into an ordered map by group name.
 * @param {Array<Object>} entries - Page entries
 * @returns {Map<string, Array<Object>>} Ordered group map
 */
function groupEntries(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    const name = entry.group || 'Pages';
    if (!grouped.has(name)) {
      grouped.set(name, []);
    }
    grouped.get(name).push(entry);
  }
  return grouped;
}

/**
 * Render the llms.txt markdown body for a set of entries.
 * @param {Array<Object>} entries - Page entries
 * @param {Object} header - Header info
 * @param {string} header.title - Site/section title
 * @param {string} [header.description] - Blockquote description
 * @param {string} [header.details] - Extra markdown block
 * @returns {string} Full llms.txt content
 */
function renderIndex(entries, { title, description, details }) {
  const lines = [];
  lines.push(`# ${title}`);
  lines.push('');
  if (description) {
    lines.push(`> ${description}`);
    lines.push('');
  }
  if (details) {
    lines.push(details.trim());
    lines.push('');
  }
  const grouped = groupEntries(entries);
  for (const [groupName, groupEntriesList] of grouped) {
    lines.push(`## ${groupName}`);
    lines.push('');
    for (const entry of groupEntriesList) {
      const desc = entry.description ? `: ${entry.description}` : '';
      lines.push(`- [${entry.title}](${entry.url})${desc}`);
    }
    lines.push('');
  }
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

/**
 * Render the llms-full.txt plaintext dump for a set of entries.
 * @param {Array<Object>} entries - Page entries
 * @param {Object} header - Header info
 * @param {string} header.title - Site/section title
 * @param {string} [header.description] - Blockquote description
 * @returns {string} Full plaintext dump
 */
function renderFullText(entries, { title, description }) {
  const parts = [];
  parts.push(`# ${title}`);
  if (description) {
    parts.push(`\n> ${description}`);
  }
  parts.push('');
  const grouped = groupEntries(entries);
  for (const [groupName, groupEntriesList] of grouped) {
    parts.push(`## ${groupName}`);
    parts.push('');
    for (const entry of groupEntriesList) {
      parts.push(`### ${entry.title}`);
      parts.push(entry.url);
      parts.push('');
      parts.push(entry.plaintext);
      parts.push('');
      parts.push('---');
      parts.push('');
    }
  }
  return `${parts.join('\n').replace(/\n+$/, '')}\n`;
}

/**
 * Tolerant locale equality: accepts mixed short ('en') and full ('en_US')
 * forms so config-vs-file-metadata mismatches don't silently misroute output.
 * @param {string} a - Locale id
 * @param {string} b - Locale id
 * @returns {boolean} True if the two refer to the same language
 */
function localesMatch(a, b) {
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  return a.split(/[_-]/)[0] === b.split(/[_-]/)[0];
}

/**
 * Compute an output path rooted under a locale prefix when applicable.
 * Files whose locale matches `defaultLocale` emit at the site root so the
 * llmstxt.org convention (`/llms.txt`) resolves for the primary language.
 * @param {string} output - Base filename
 * @param {string} locale - Locale id (empty string = no locale)
 * @param {string} defaultLocale - Locale that emits at root
 * @returns {string} Final file path
 */
function localizedOutput(output, locale, defaultLocale) {
  if (!locale || localesMatch(locale, defaultLocale)) {
    return output;
  }
  return `${locale}/${output}`;
}

/**
 * Process files and emit the llms.txt (and optional llms-full.txt) files.
 * @param {Object} files - Metalsmith files object
 * @param {Object} metalsmith - Metalsmith instance
 * @param {Object} options - Configuration
 * @returns {Promise<void>} Resolves when files have been added
 */
export function processLlms(files, metalsmith, options) {
  return new Promise((resolve, reject) => {
    try {
      const {
        output = 'llms.txt',
        fullText = false,
        fullTextOutput = 'llms-full.txt',
        title,
        description,
        details,
        pattern = '**/*.html',
        privateProperty = 'private',
        seoProperty = 'seo',
        hostname,
        groups,
        perLocale = false,
        locales,
        defaultLocale = '',
        sort = 'date-desc'
      } = options;

      const entries = collectEntries(files, metalsmith, {
        pattern,
        privateProperty,
        seoProperty,
        hostname,
        groups,
        locales
      });

      sortEntries(entries, sort);

      // Bucket entries by output path. Multiple locales can collide on the
      // same path — e.g. default-locale entries and unlocalized entries both
      // emit at root when perLocale is on. Keying by resolved path lets us
      // merge rather than overwrite.
      const buckets = new Map();
      const addToBucket = (path, entry) => {
        if (!buckets.has(path)) {
          buckets.set(path, []);
        }
        buckets.get(path).push(entry);
      };
      if (perLocale) {
        for (const entry of entries) {
          const locale = entry.locale || '';
          // With no defaultLocale, unlocalized entries have no natural home —
          // skip them rather than producing an ambiguous root file.
          if (!locale && !defaultLocale) {
            continue;
          }
          addToBucket(localizedOutput(output, locale, defaultLocale), entry);
        }
      } else {
        for (const entry of entries) {
          addToBucket(output, entry);
        }
      }

      for (const [indexPath, bucketEntries] of buckets) {
        if (bucketEntries.length === 0) {
          continue;
        }
        const header = {
          title: title || 'Site',
          description,
          details
        };
        files[indexPath] = {
          contents: Buffer.from(renderIndex(bucketEntries, header), 'utf-8'),
          mode: '0644'
        };
        if (fullText) {
          // Mirror the index path to the full-text filename.
          const fullPath = indexPath.replace(
            new RegExp(`${output.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
            fullTextOutput
          );
          files[fullPath] = {
            contents: Buffer.from(renderFullText(bucketEntries, header), 'utf-8'),
            mode: '0644'
          };
        }
      }

      resolve();
    } catch (error) {
      reject(new Error(`Failed to generate llms.txt: ${error.message}`));
    }
  });
}
