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

/**
 * Creates a new object with only the properties that pass the predicate test.
 * @param {Object} obj - The source object
 * @param {function(*): boolean} predicate - Function to test each property value
 * @returns {Object} New object with filtered properties
 */
export const pick = (obj, predicate) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (predicate(value)) {
      result[key] = value;
    }
  }
  return result;
};

/**
 * Identity function that returns the input value unchanged.
 * @param {*} value - Any value
 * @returns {*} The same value
 */
export const identity = (value) => value;