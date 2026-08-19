import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { categories, content } from '../db/schema.js';
import { eq, count, asc } from 'drizzle-orm';
import { ValidatedRequest } from '../validators/queryValidator.js';
import { CategoryQueryParams } from '../validators/publicQueryValidator.js';

export interface LocalizedCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  articleCount: number;
  sortOrder: number;
}

/**
 * Helper to pick localized name & description with fallback
 */
function getLocalizedCategoryFields(
  row: typeof categories.$inferSelect,
  lang: string
): { name: string; description: string | null } {
  switch (lang.toLowerCase()) {
    case 'en':
      return {
        name: row.nameEn || row.nameAm || row.slug,
        description: row.descriptionEn ?? row.descriptionAm ?? null,
      };
    case 'om':
      return {
        name: row.nameOm || row.nameEn || row.nameAm || row.slug,
        description: row.descriptionOm ?? row.descriptionEn ?? row.descriptionAm ?? null,
      };
    case 'ti':
      return {
        name: row.nameTi || row.nameAm || row.nameEn || row.slug,
        description: row.descriptionTi ?? row.descriptionAm ?? row.descriptionEn ?? null,
      };
    case 'am':
    default:
      return {
        name: row.nameAm || row.nameEn || row.slug,
        description: row.descriptionAm ?? row.descriptionEn ?? null,
      };
  }
}

/**
 * List all active categories with localized metadata & article counts
 * GET /api/v1/categories?lang=am
 */
export async function getCategories(req: Request, _res: Response) {
  const query = (req as ValidatedRequest<CategoryQueryParams>).validatedQuery || { lang: 'am' };
  const lang = query.lang || 'am';

  // Fetch active categories and article counts in parallel
  const [activeCategories, articleCounts] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.isActive, 1))
      .orderBy(asc(categories.sortOrder), asc(categories.id)),
    db
      .select({
        categoryId: content.categoryId,
        count: count(content.id),
      })
      .from(content)
      .where(eq(content.status, 'published'))
      .groupBy(content.categoryId),
  ]);

  const countMap = new Map<number, number>();
  for (const item of articleCounts) {
    countMap.set(item.categoryId, Number(item.count));
  }

  // Format localized response
  const result: LocalizedCategory[] = activeCategories.map((cat) => {
    const { name, description } = getLocalizedCategoryFields(cat, lang);
    return {
      id: cat.id,
      slug: cat.slug,
      name,
      description,
      articleCount: countMap.get(cat.id) || 0,
      sortOrder: cat.sortOrder ?? 0,
    };
  });

  return {
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      lang,
      total: result.length,
    },
  };
}
