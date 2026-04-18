/**
 * @fileoverview Shared HTML-attribute escaping helper.
 * Centralized so generators and the head injector cannot drift.
 */

/**
 * Escapes the five characters that are unsafe inside an HTML attribute or
 * element body. Non-string input is coerced via String() so callers do not
 * need to pre-validate.
 * @param {*} str - Value to escape
 * @returns {string} Escaped string safe for double-quoted HTML attributes
 */
export function escapeHtml(str) {
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
