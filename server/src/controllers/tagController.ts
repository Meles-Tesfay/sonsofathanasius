import { Request, Response } from 'express';
import { ValidatedRequest } from '../validators/queryValidator.js';
import { TagQueryParams } from '../validators/publicQueryValidator.js';
import { db } from '../db/index.js';
import { tags, contentTags, content } from '../db/schema.js';
import { eq, sql, and } from 'drizzle-orm';
import type { TagDTO } from '../types/index.js';

/**
 * List all tags with published article counts.
 * GET /api/v1/tags?lang=am
 *
 * Tags are language-independent (stored as bilingual strings like "ሥላሴ | Trinity").
 * The `lang` parameter is accepted for API consistency but does not affect filtering.
 *
 * Returns raw data for cachedRoute() — do NOT call res.json() directly.
 */
export async function listTags(
  req: ValidatedRequest<TagQueryParams>,
  _res: Response
): Promise<unknown> {
  const { lang } = req.validatedQuery!;

  // Fetch all tags with count of published articles via LEFT JOIN
  const rows = await db
    .select({
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
      articleCount: sql<number>`COUNT(DISTINCT ${content.id})`.as('article_count'),
    })
    .from(tags)
    .leftJoin(contentTags, eq(contentTags.tagId, tags.id))
    .leftJoin(
      content,
      and(
        eq(content.id, contentTags.contentId),
        eq(content.status, 'published')
      )
    )
    .groupBy(tags.id, tags.slug, tags.name)
    .orderBy(tags.name);

  const result: TagDTO[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    articleCount: row.articleCount ?? 0,
  }));

  return {
    success: true,
    data: result,
    meta: {
      total: result.length,
      lang,
      timestamp: new Date().toISOString(),
    },
  };
}
