import { LRUCache } from 'lru-cache';
import { db } from '../db/index.js';
import { content } from '../db/schema.js';
import { sql } from 'drizzle-orm';

// In-memory view count buffer (holds increments for up to 2000 articles)
const viewCounters = new LRUCache<number, number>({
  max: 2000,
  ttl: 120_000, // 2 minutes
});

/**
 * Record an article read view in memory
 */
export function trackArticleView(articleId: number): void {
  const current = viewCounters.get(articleId) ?? 0;
  viewCounters.set(articleId, current + 1);
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
