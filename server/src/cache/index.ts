import { LRUCache } from 'lru-cache';
import { recordEviction } from './metrics.js';

export interface CacheEntry {
  payload: string;
  storedAt: number;
}

/**
 * High-Performance In-Memory LRU Cache Instance
 * - Max Entries: 2,000 keys
 * - Max Memory Cap: 50 MB (CloudLinux LVE protection)
 * - Byte Calculation: Byte-accurate UTF-8 accounting for Ethiopic script (3 bytes/char)
 * - Storage Format: Pre-stringified JSON (zero clone overhead, sub-millisecond throughput)
 */
export const cache = new LRUCache<string, CacheEntry>({
  max: 2000,
  maxSize: 50 * 1024 * 1024, // 50 MB
  sizeCalculation: (entry) => Buffer.byteLength(entry.payload, 'utf8'),
  ttl: 0, // No global TTL; per-set TTLs are applied per namespace
  allowStale: false,
  updateAgeOnGet: false, // Fixed TTL freshness, not sliding
  dispose: (_val, _key, reason) => {
    if (reason === 'evict') {
      recordEviction();
    }
  },
});

export const CACHE_TTL = {
  CATEGORIES: 3_600_000,    // 1 hour
  CATEGORIES_STALE: 300_000, // 5 mins
  ARTICLES_FEED: 300_000,   // 5 mins
  ARTICLES_FEED_STALE: 60_000, // 1 min
  ARTICLES_LATEST: 300_000, // 5 mins
  ARTICLE_DETAIL: 600_000,  // 10 mins
  ARTICLE_DETAIL_STALE: 120_000, // 2 mins
  TAGS: 3_600_000,          // 1 hour
  DAILY: 86_400_000,        // 24 hours
  DAILY_STALE: 3_600_000,   // 1 hour
} as const;
