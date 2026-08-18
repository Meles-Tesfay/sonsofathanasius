import { cache } from './index.js';

interface CacheStats {
  hits: number;
  misses: number;
  coalesced: number;
  staleServed: number;
  evictions: number;
}

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  coalesced: 0,
  staleServed: 0,
  evictions: 0,
};

export const recordHit = () => { stats.hits++; };
export const recordMiss = () => { stats.misses++; };
export const recordCoalesced = () => { stats.coalesced++; };
export const recordStaleServed = () => { stats.staleServed++; };
export const recordEviction = () => { stats.evictions++; };

export function getCacheMetrics() {
  const totalRequests = stats.hits + stats.misses + stats.coalesced;
  const hitRate = totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;
  const coalesceRate = totalRequests > 0 ? (stats.coalesced / totalRequests) * 100 : 0;

  return {
    entriesCount: cache.size,
    calculatedSizeBytes: cache.calculatedSize,
    calculatedSizeMB: (cache.calculatedSize / (1024 * 1024)).toFixed(2),
    maxSizeBytes: cache.maxSize,
    totalRequests,
    hits: stats.hits,
    misses: stats.misses,
    coalescedRequests: stats.coalesced,
    staleServedCount: stats.staleServed,
    evictionsCount: stats.evictions,
    hitRatePercentage: Number(hitRate.toFixed(2)),
    coalesceRatePercentage: Number(coalesceRate.toFixed(2)),
  };
}
