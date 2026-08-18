import { cache } from './index.js';

/**
 * Invalidate all cache keys matching a given prefix
 * @param prefix Cache namespace prefix (e.g. 'art:', 'cat:', 'tag:', 'daily:')
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

export function invalidateArticleCaches(): number {
  return invalidateByPrefix('art:');
}

export function invalidateCategoryCaches(): number {
  return invalidateByPrefix('cat:');
}

export function invalidateTagCaches(): number {
  return invalidateByPrefix('tag:');
}

export function invalidateDailyCaches(): number {
  return invalidateByPrefix('daily:');
}

export function invalidateAllCaches(): void {
  cache.clear();
}
