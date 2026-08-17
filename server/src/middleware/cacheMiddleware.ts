import { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';
import { cache } from '../cache/index.js';
import {
  recordHit,
  recordMiss,
  recordCoalesced,
  recordStaleServed,
} from '../cache/metrics.js';

// ── 1. Query Canonicalization ────────────────────────────────────
// Same params in different order => same cache key.
export const canonicalKey = (req: Request): string => {
  try {
    const url = new URL(req.originalUrl, 'http://localhost');
    url.searchParams.sort(); // Deterministically sort query parameters
    return `${url.pathname}${url.search}`;
  } catch {
    return req.originalUrl;
  }
};

// ── 2. Keyed Single-Flight Request Coalescer ─────────────────────
// In-flight flight result interface carrying payload and resolution outcome
interface FlightResult {
  payload: string;
  outcome: 'loaded' | 'stale';
}

const inflight = new LRUCache<string, Promise<FlightResult>>({
  max: 1000,
});

// ── 3. TTL Jitter (±10% Randomization prevents synchronized expiry) ─────
export const jitter = (ttlMs: number): number =>
  Math.round(ttlMs * (0.9 + Math.random() * 0.2));

// ── 4. Core Cache Getter with Stale-on-Error Support ─────────────────────
export async function getCached(
  key: string,
  freshMs: number,
  staleMs: number = 0,
  loader: () => Promise<string>
): Promise<{ payload: string; source: 'fresh' | 'miss' | 'coalesced' | 'stale' }> {
  const entry = cache.get(key);
  const age = entry ? Date.now() - entry.storedAt : Infinity;

  // Cache HIT: within fresh window
  if (entry && age < freshMs) {
    recordHit();
    return { payload: entry.payload, source: 'fresh' };
  }

  // Single-Flight: Join already in-flight DB query
  const existingFlight = inflight.get(key);
  if (existingFlight) {
    recordCoalesced();
    const result = await existingFlight;
    return {
      payload: result.payload,
      source: result.outcome === 'stale' ? 'stale' : 'coalesced',
    };
  }

  // Cache MISS: Launch single-flight DB loader
  recordMiss();
  const flight = (async (): Promise<FlightResult> => {
    try {
      const payload = await loader();
      
      // Never cache null, undefined, or empty error payloads
      if (payload && payload !== 'null' && payload !== 'undefined') {
        // Fix: Store with TTL = freshMs + staleMs so the entry lives through the stale window
        cache.set(
          key,
          { payload, storedAt: Date.now() },
          { ttl: jitter(freshMs + staleMs) }
        );
      }
      return { payload, outcome: 'loaded' };
    } catch (err) {
      // Stale-on-Error: Serve last-known-good during DB downtime/recovery
      if (entry && age < freshMs + staleMs) {
        recordStaleServed();
        return { payload: entry.payload, outcome: 'stale' };
      }
      throw err;
    }
  })();

  inflight.set(key, flight);
  void flight.finally(() => inflight.delete(key)); // Poison-pill cleanup guarantee

  const result = await flight;
  return {
    payload: result.payload,
    source: result.outcome === 'stale' ? 'stale' : 'miss',
  };
}

// ── 5. Declarative Cached Route Wrapper for Controllers ──────────────────
export const cachedRoute = (
  namespace: string,
  freshMs: number,
  staleMs: number = 0
) => {
  return (
    handler: (req: Request, res: Response) => Promise<unknown>
  ) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = `${namespace}:${canonicalKey(req)}`;

      try {
        const { payload, source } = await getCached(
          key,
          freshMs,
          staleMs,
          async () => {
            const data = await handler(req, res);
            return JSON.stringify(data);
          }
        );

        // Header telemetry
        const cacheHeaderValue =
          source === 'fresh'
            ? 'HIT'
            : source === 'stale'
            ? 'STALE'
            : source === 'coalesced'
            ? 'COALESCED'
            : 'MISS';

        res.setHeader('X-Cache', cacheHeaderValue);

        if (source === 'stale') {
          res.setHeader('Warning', '110 Response is stale'); // RFC 5861 compliance
        }

        res.setHeader('Content-Type', 'application/json');
        return res.send(payload);
      } catch (err) {
        return next(err);
      }
    };
  };
};
