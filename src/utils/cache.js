/**
 * Simple in-memory cache for API responses
 */

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached value
 */
export function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;

  // Check if expired
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

/**
 * Set cache value
 */
export function setCache(key, value, ttl = CACHE_TTL) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Clear cache
 */
export function clearCache(key = null) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Clear expired cache entries
 */
export function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now > item.expiresAt) {
      cache.delete(key);
    }
  }
}

// Clean expired cache every minute
setInterval(cleanExpiredCache, 60 * 1000);

