import { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';
import { db } from '../db/index.js';
import { content, contentTranslations } from '../db/schema.js';
import { sql, eq } from 'drizzle-orm';

// 1. In-memory view count buffer (holds increments for up to 2000 articles)
const viewCounters = new LRUCache<number, number>({
  max: 2000,
  ttl: 120_000, // 2 minutes
});

// 2. In-memory Slug -> ContentId resolution cache (avoids DB queries on cache HITs)
const slugToContentIdMap = new LRUCache<string, number>({
  max: 3000,
  ttl: 86400_000, // 24 hours
});

/**
 * Prime or update the in-memory slug to article ID mapping
 */
export function recordSlugIdMapping(slug: string, contentId: number): void {
  if (slug && contentId) {
    slugToContentIdMap.set(slug.trim(), contentId);
  }
}

/**
 * Record an article read view in memory by numeric article ID
 */
export function trackArticleView(articleId: number): void {
  if (!articleId || isNaN(articleId)) return;
  const current = viewCounters.get(articleId) ?? 0;
  viewCounters.set(articleId, current + 1);
}

/**
 * Record an article read view in memory by slug or ID string.
 * Resolves synchronously via in-memory map for cache HITs, or asynchronously on cold slug.
 */
export function trackArticleViewBySlug(slug: string): void {
  if (!slug) return;
  const cleanSlug = slug.trim();

  // Check if slug is already a numeric content ID
  if (/^\d+$/.test(cleanSlug)) {
    trackArticleView(parseInt(cleanSlug, 10));
    return;
  }

  // Fast path: In-memory cache hit
  const cachedId = slugToContentIdMap.get(cleanSlug);
  if (cachedId) {
    trackArticleView(cachedId);
    return;
  }

  // Cold path: Asynchronously resolve ID from DB and record
  void (async () => {
    try {
      const rows = await db
        .select({ contentId: contentTranslations.contentId })
        .from(contentTranslations)
        .where(eq(contentTranslations.slug, cleanSlug))
        .limit(1);

      if (rows.length > 0 && rows[0].contentId) {
        const id = rows[0].contentId;
        slugToContentIdMap.set(cleanSlug, id);
        trackArticleView(id);
      }
    } catch {
      // Non-critical background metric tracking
    }
  })();
}

/**
 * Express middleware that records article views on EVERY request (both cache HIT and MISS)
 * before cachedRoute sends the cached response payload.
 */
export function trackViewMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const rawSlug = req.params.slug;
  const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug)?.trim();
  if (slug) {
    trackArticleViewBySlug(slug);
  }
  next();
}

/**
 * Flush accumulated view counts to MariaDB atomically in a transaction.
 * Only deletes from memory on successful DB commit to prevent data loss.
 */
export async function flushViewCounts(): Promise<void> {
  const snapshot: Array<{ articleId: number; count: number }> = [];

  for (const articleId of viewCounters.keys()) {
    const count = viewCounters.get(articleId);
    if (count && count > 0) {
      snapshot.push({ articleId, count });
    }
  }

  if (snapshot.length === 0) return;

  try {
    // Atomic batch update within a transaction
    await db.transaction(async (tx) => {
      for (const { articleId, count } of snapshot) {
        await tx
          .update(content)
          .set({ viewCount: sql`${content.viewCount} + ${count}` })
          .where(sql`${content.id} = ${articleId}`);
      }
    });

    // Delete from in-memory map ONLY after the transaction commits successfully
    for (const { articleId, count } of snapshot) {
      const remaining = (viewCounters.get(articleId) ?? 0) - count;
      if (remaining <= 0) {
        viewCounters.delete(articleId);
      } else {
        viewCounters.set(articleId, remaining);
      }
    }
  } catch (err) {
    console.error('⚠️ [ViewCounter] Batch flush failed, retaining counts in memory for next cycle:', err);
  }
}

// Flush view counts every 60 seconds
const flushInterval = setInterval(() => {
  void flushViewCounts();
}, 60_000);

// Ensure timer does not prevent clean process shutdown
if (flushInterval.unref) {
  flushInterval.unref();
}
