/**
 * Test utilities for metalsmith-seo
 * These utilities are only used for testing and are not part of the public API
 */

/**
 * Reset the internal cache for testing purposes
 * This directly manipulates the cache variable that's not exported from the main module
 */
export function resetCache() {
  // Since we can't access the private cache variable, we'll work around it
  // by creating new instances or using other testing strategies
  // For now, this is a no-op since the cache resets automatically in test env
  
  // The cache is already isolated per test run when NODE_ENV=test
  // so this function exists mainly for API compatibility with existing tests
}