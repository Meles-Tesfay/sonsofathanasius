import { cache } from './index.js';

/**
 * Invalidate all cache keys matching a given prefix
 * @param prefix Cache namespace prefix (e.g. 'articles', 'categories', 'tags', 'daily')
 * @returns Number of keys evicted
 */
export function invalidateByPrefix(prefix: string): number {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Invalidate all article-related feed and detail cache keys
 */
export function invalidateArticleCaches(): number {
  const count1 = invalidateByPrefix('articles');
  const count2 = invalidateByPrefix('art:');
  return count1 + count2;
}

/**
 * Invalidate all category listing and taxonomy cache keys
 */
export function invalidateCategoryCaches(): number {
  const count1 = invalidateByPrefix('categories');
  const count2 = invalidateByPrefix('cat:');
  return count1 + count2;
}

/**
 * Invalidate all tag listing and tag article count cache keys
 */
export function invalidateTagCaches(): number {
  const count1 = invalidateByPrefix('tags');
  const count2 = invalidateByPrefix('tag:');
  return count1 + count2;
}

/**
 * Invalidate all daily lectionary cache keys
 */
export function invalidateDailyCaches(): number {
  return invalidateByPrefix('daily');
}

/**
 * Invalidate entire LRU cache across all namespaces
 */
export function invalidateAllCaches(): void {
  cache.clear();
}
