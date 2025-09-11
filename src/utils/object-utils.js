/**
 * @fileoverview Utility functions for object manipulation.
 */

/**
 * Safely gets a nested property value from an object using dot notation.
 * @param {Object} obj - The object to query
 * @param {string} pathStr - The property path (e.g., 'a.b.c')
 * @param {*} [defaultValue] - Value to return if the property is undefined
 * @returns {*} The property value or defaultValue
 */
export const get = (obj, pathStr, defaultValue) => {
  if (!obj || !pathStr || typeof pathStr !== "string") {
    return defaultValue;
  }
  const keys = pathStr.split(".");
  let result = obj;
  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) {
      return defaultValue;
    }
  }
  return result;
};
