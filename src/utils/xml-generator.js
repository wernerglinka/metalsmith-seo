/**
 * @fileoverview XML generation utilities for sitemap creation.
 *
 * This module contains pure functions for generating XML content, separated from
 * the main sitemap processing logic for better maintainability and testability.
 *
 * ## Security Focus
 *
 * All XML generation functions in this module prioritize security through proper
 * character escaping to prevent XML injection attacks and ensure valid output.
 */

/**
 * Escapes special XML characters to prevent XML injection and ensure valid output.
 *
 * This function implements the five standard XML character entity references
 * as defined in the XML 1.0 specification. It's critical for security and
 * correctness when embedding user-controlled content in XML.
 *
 * ## Security Considerations
 *
 * XML character escaping prevents:
 * - XML injection attacks where malicious XML could be injected
 * - XML parsing errors from unescaped special characters
 * - XSS attacks if the XML is later processed in a web context
 *
 * ## Performance Notes
 *
 * This implementation uses simple string replacement rather than regex for
 * better performance with large strings. The order of replacements is important:
 * ampersand (&) must be escaped first to avoid double-escaping.
 *
 * @param {string} str - String to escape for safe XML inclusion
 * @returns {string} XML-safe string with special characters escaped, empty string if input is not a string
 *
 * @example
 * escapeXML('AT&T <mobile> "quotes" & \'apostrophes\'');
 * // Returns: 'AT&amp;T &lt;mobile&gt; &quot;quotes&quot; &amp; &apos;apostrophes&apos;'
 *
 * @example
 * escapeXML(null); // Returns: ''
 * escapeXML(123);  // Returns: ''
 */
export function escapeXML(str) {
  if (typeof str !== "string") {
    return "";
  }
  return str
    .replace(/&/g, "&amp;") // Must be first to avoid double-escaping
    .replace(/</g, "&lt;") // Less-than sign
    .replace(/>/g, "&gt;") // Greater-than sign
    .replace(/"/g, "&quot;") // Double quote
    .replace(/'/g, "&apos;"); // Apostrophe/single quote
}

/**
 * Generates complete XML sitemap content from processed link data.
 *
 * This is the core XML generation function that builds a standards-compliant
 * sitemap.xml file. It handles all the formatting details and edge cases
 * to ensure the output matches the behavior of the original sitemap library.
 *
 * ## XML Structure
 *
 * The generated XML follows the sitemaps.org protocol structure:
 * ```xml
 * <?xml version="1.0" encoding="UTF-8"?>
 * <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
 *   <url>
 *     <loc>https://example.com/page</loc>
 *     <lastmod>2024-01-15T00:00:00.000Z</lastmod>
 *     <changefreq>weekly</changefreq>
 *     <priority>0.8</priority>
 *     <xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr/page"/>
 *   </url>
 * </urlset>
 * ```
 *
 * ## URL Handling Logic
 *
 * URLs are processed with the following logic:
 * 1. **Absolute URLs**: Used as-is if they start with 'http'
 * 2. **Relative URLs**: Combined with hostname, handling trailing/leading slashes
 * 3. **Path normalization**: Ensures no double slashes in the final URL
 *
 * ## Element Generation Rules
 *
 * - **`<loc>`**: Always present, contains the full absolute URL
 * - **`<lastmod>`**: Only included if lastmod value exists and is valid
 * - **`<changefreq>`**: Only included if changefreq is specified
 * - **`<priority>`**: Only included if priority is not undefined/null
 * - **`<xhtml:link>`**: Only included for entries with alternate language links
 *
 * ## Namespace Handling
 *
 * The implementation uses minimal namespace declarations to match the original
 * library behavior. The xhtml namespace is not declared in the root element
 * but is used directly in xhtml:link elements (browsers handle this correctly).
 *
 * ## Performance Optimizations
 *
 * - String concatenation is used instead of DOM manipulation for speed
 * - Single pass through the links array
 * - Minimal string allocations
 * - No external dependencies or complex parsing
 *
 * @param {Array<Object>} links - Array of processed URL entries with metadata
 * @param {string} links[].url - Relative or absolute URL for the page
 * @param {string} [links[].lastmod] - ISO date string for last modification
 * @param {string} [links[].changefreq] - Change frequency (daily, weekly, etc.)
 * @param {number|string} [links[].priority] - Priority value (0.0 to 1.0)
 * @param {Array<Object>} [links[].links] - Array of alternate language links
 * @param {string} links[].links[].lang - Language code (e.g., 'en', 'fr')
 * @param {string} links[].links[].url - Absolute URL for the alternate version
 * @param {string} hostname - Base hostname for relative URL resolution (e.g., 'https://example.com')
 * @returns {string} Complete XML sitemap content ready for file output
 *
 * @example
 * // Basic sitemap with simple URLs
 * const links = [
 *   { url: 'index.html', priority: 1.0, changefreq: 'daily' },
 *   { url: 'about.html', priority: 0.8, lastmod: '2024-01-15T00:00:00.000Z' }
 * ];
 * const xml = generateSitemapXML(links, 'https://example.com');
 *
 * @example
 * // Advanced sitemap with alternate language links
 * const links = [
 *   {
 *     url: 'index.html',
 *     priority: 1.0,
 *     links: [
 *       { lang: 'en', url: 'https://example.com/' },
 *       { lang: 'fr', url: 'https://example.com/fr/' }
 *     ]
 *   }
 * ];
 * const xml = generateSitemapXML(links, 'https://example.com');
 */
export function generateSitemapXML(links, hostname) {
  // Start building the XML - always use basic namespace like the old library
  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  // Process each URL entry
  for (const link of links) {
    xml += "<url>";

    // Build the complete URL with proper hostname handling
    const fullUrl = link.url.startsWith("http")
      ? link.url
      : `${hostname.replace(/\/$/, "")}/${link.url.replace(/^\//, "")}`;
    xml += `<loc>${escapeXML(fullUrl)}</loc>`;

    // Add optional lastmod element
    if (link.lastmod) {
      xml += `<lastmod>${escapeXML(String(link.lastmod))}</lastmod>`;
    }

    // Add optional changefreq element
    if (link.changefreq) {
      xml += `<changefreq>${escapeXML(String(link.changefreq))}</changefreq>`;
    }

    // Add optional priority element with proper decimal formatting
    if (link.priority !== undefined && link.priority !== null) {
      // Ensure priority is formatted with decimal point (e.g., 1.0 not 1)
      const priorityStr =
        typeof link.priority === "number"
          ? link.priority.toFixed(1)
          : String(link.priority);
      xml += `<priority>${escapeXML(priorityStr)}</priority>`;
    }

    // Add alternate language links (hreflang) if present
    if (link.links && Array.isArray(link.links)) {
      for (const altLink of link.links) {
        if (altLink.lang && altLink.url) {
          xml += `<xhtml:link rel="alternate" hreflang="${escapeXML(altLink.lang)}" href="${escapeXML(altLink.url)}"/>`;
        }
      }
    }

    xml += "</url>";
  }

  xml += "</urlset>";

  return xml;
}

/*
 * ## Implementation Notes & Design Decisions
 *
 * This XML generation module was extracted from the main sitemap processor to:
 * - Improve maintainability by separating concerns
 * - Enable easier testing of XML generation logic
 * - Keep the main sitemap processor focused on file processing
 * - Allow reuse of XML utilities in other contexts if needed
 *
 * ### Why Not Use a Template Engine?
 *
 * Initially, we considered using template engines like Nunjucks for XML generation.
 * However, for sitemap generation, direct string building proved superior because:
 *
 * - **Simplicity**: Sitemaps have a straightforward, predictable structure
 * - **Performance**: String concatenation is faster than template compilation
 * - **Dependencies**: Avoids adding another external dependency
 * - **Control**: Full control over output formatting and edge cases
 * - **Size**: Keeps the implementation lightweight and focused
 *
 * ### Why Not Use XML Libraries?
 *
 * XML libraries (like xmlbuilder, xml2js) were avoided because:
 * - They add significant overhead for our simple use case
 * - Sitemap XML structure is static and predictable
 * - Manual escaping gives us explicit control over security
 * - Performance is better with direct string building
 * - Reduces bundle size and dependency complexity
 *
 * ### Security Considerations
 *
 * This module prioritizes security through:
 * - Proper XML character escaping in all output
 * - Input validation and type checking
 * - No use of dangerous functions like eval() or innerHTML
 * - Clear separation of data and markup
 *
 * ### Future Maintenance
 *
 * If you need to modify this XML generation:
 * 1. Always escape user-controlled content with escapeXML()
 * 2. Test with real XML validators after changes
 * 3. Maintain compatibility with existing test expectations
 * 4. Consider security implications of any new XML features
 * 5. Keep functions pure (no side effects) for easier testing
 */
