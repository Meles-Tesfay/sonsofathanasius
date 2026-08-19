import { Request, Response } from 'express';
import { ValidatedRequest } from '../validators/queryValidator.js';
import { CategoryQueryParams } from '../validators/publicQueryValidator.js';
import { db } from '../db/index.js';
import { categories, content } from '../db/schema.js';
import { eq, sql, and } from 'drizzle-orm';
import type { SupportedLanguage, CategoryListItem } from '../types/index.js';

/**
 * Resolve the localized name for a category row based on requested language.
 * Falls back to English if the requested language translation is null.
 */
function resolveLocalizedName(
  row: {
    nameEn: string;
    nameAm: string | null;
    nameOm: string | null;
    nameTi: string | null;
  },
  lang: SupportedLanguage
): string {
  const map: Record<SupportedLanguage, string | null> = {
    am: row.nameAm,
    en: row.nameEn,
    om: row.nameOm,
    ti: row.nameTi,
  };
  return map[lang] ?? row.nameEn;
}

/**
 * Resolve the localized description for a category row based on requested language.
 * Falls back to English if the requested language translation is null.
 */
function resolveLocalizedDescription(
  row: {
    descriptionEn: string | null;
    descriptionAm: string | null;
    descriptionOm: string | null;
    descriptionTi: string | null;
  },
  lang: SupportedLanguage
): string | null {
  const map: Record<SupportedLanguage, string | null> = {
    am: row.descriptionAm,
    en: row.descriptionEn,
    om: row.descriptionOm,
    ti: row.descriptionTi,
  };
  return map[lang] ?? row.descriptionEn;
}

/**
 * List all active categories with localized names and published article counts.
 * GET /api/v1/categories?lang=am
 *
 * Returns raw data for cachedRoute() — do NOT call res.json() directly.
 */
export async function listCategories(
  req: ValidatedRequest<CategoryQueryParams>,
  _res: Response
): Promise<unknown> {
  const { lang } = req.validatedQuery!;

  // 1. Fetch all active categories ordered by sortOrder
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, 1))
    .orderBy(categories.sortOrder);

  // 2. Fetch published article counts per category in a single query
  const countRows = await db
    .select({
      categoryId: content.categoryId,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(content)
    .where(eq(content.status, 'published'))
    .groupBy(content.categoryId);

  const countMap = new Map<number, number>();
  for (const row of countRows) {
    countMap.set(row.categoryId, row.count);
  }

  // 3. Map to CategoryListItem with localized fields
  const result: CategoryListItem[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: resolveLocalizedName(row, lang),
    description: resolveLocalizedDescription(row, lang),
    sortOrder: row.sortOrder ?? 0,
    articleCount: countMap.get(row.id) ?? 0,
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
