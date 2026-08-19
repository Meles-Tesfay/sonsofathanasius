import { Request, Response } from 'express';
import { db } from '../db/index.js';
import {
  content,
  contentTranslations,
  categories,
  tags,
  contentTags,
  contentMedia,
} from '../db/schema.js';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { extractScriptureCitations } from '../services/citationParser.js';
import { recordSlugIdMapping } from '../cache/viewCounter.js';
import { NotFoundError } from '../middleware/errorHandler.js';

export interface ArticleListItem {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  authorName: string | null;
  coverImage: string | null;
  pdfEnabled: number | null;
  viewCount: number | null;
  publishedAt: Date | null;
  langCode: string;
  isFallback: boolean;
  category: {
    id: number;
    slug: string;
    name: string;
  };
  tags: Array<{
    id: number;
    slug: string;
    name: string;
  }>;
}

export interface ArticleDetailResponse {
  id: number;
  categoryId: number;
  category: {
    id: number;
    slug: string;
    name: string;
  };
  authorName: string | null;
  coverImage: string | null;
  pdfEnabled: number | null;
  viewCount: number | null;
  publishedAt: Date | null;
  updatedAt: Date | null;
  langCode: string;
  isFallback: boolean;
  fallbackFrom?: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  pdfFilePath: string | null;
  citations: string[];
  tags: Array<{
    id: number;
    slug: string;
    name: string;
  }>;
  media: Array<{
    id: number;
    mediaKind: 'video' | 'audio';
    platform: string;
    embedId: string;
    caption: string | null;
  }>;
  availableTranslations: Array<{
    langCode: string;
    slug: string;
    title: string;
  }>;
}

/**
 * Helper to pick localized category name
 */
function getLocalizedCategoryName(
  cat: { nameAm: string | null; nameEn: string; nameOm: string | null; nameTi: string | null; slug: string },
  lang: string
): string {
  switch (lang.toLowerCase()) {
    case 'en':
      return cat.nameEn || cat.nameAm || cat.slug;
    case 'om':
      return cat.nameOm || cat.nameEn || cat.nameAm || cat.slug;
    case 'ti':
      return cat.nameTi || cat.nameAm || cat.nameEn || cat.slug;
    case 'am':
    default:
      return cat.nameAm || cat.nameEn || cat.slug;
  }
}

/**
 * List paginated articles with multilingual fallback, category/tag filtering, and sorting
 * GET /api/v1/articles?category={slug}&tag={slug}&page=1&limit=12&lang=am&sort=latest|popular
 */
export async function getArticles(req: Request, _res: Response) {
  const lang = (typeof req.query.lang === 'string' ? req.query.lang : 'am').toLowerCase();
  const categorySlug = typeof req.query.category === 'string' ? req.query.category.trim() : undefined;
  const tagSlug = typeof req.query.tag === 'string' ? req.query.tag.trim() : undefined;
  const sort = req.query.sort === 'popular' ? 'popular' : 'latest';
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 12));
  const offset = (page - 1) * limit;

  // 1. Resolve Category ID filter if requested
  let categoryIdFilter: number | undefined;
  if (categorySlug) {
    const cat = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
    if (cat.length > 0) {
      categoryIdFilter = cat[0].id;
    } else {
      // Requested category does not exist -> return empty page
      return {
        success: true,
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
          timestamp: new Date().toISOString(),
          lang,
          category: categorySlug,
        },
      };
    }
  }

  // 2. Resolve Tag ID filter if requested
  let tagContentIds: number[] | undefined;
  if (tagSlug) {
    const tagRows = await db.select().from(tags).where(eq(tags.slug, tagSlug)).limit(1);
    if (tagRows.length > 0) {
      const tagId = tagRows[0].id;
      const contentTagRows = await db
        .select({ contentId: contentTags.contentId })
        .from(contentTags)
        .where(eq(contentTags.tagId, tagId));
      tagContentIds = contentTagRows.map((r) => r.contentId);
      if (tagContentIds.length === 0) {
        return {
          success: true,
          data: [],
          meta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
            timestamp: new Date().toISOString(),
            lang,
            tag: tagSlug,
          },
        };
      }
    } else {
      // Requested tag does not exist
      return {
        success: true,
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
          timestamp: new Date().toISOString(),
          lang,
          tag: tagSlug,
        },
      };
    }
  }

  // 3. Build conditions for published articles
  const conditions = [eq(content.status, 'published')];
  if (categoryIdFilter !== undefined) {
    conditions.push(eq(content.categoryId, categoryIdFilter));
  }
  if (tagContentIds !== undefined) {
    conditions.push(inArray(content.id, tagContentIds));
  }

  const whereClause = and(...conditions);

  // 4. Count total matching articles
  const [totalCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(content)
    .where(whereClause);
  const total = Number(totalCountResult?.count || 0);
  const totalPages = Math.ceil(total / limit) || 1;

  if (total === 0) {
    return {
      success: true,
      data: [],
      meta: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        timestamp: new Date().toISOString(),
        lang,
      },
    };
  }

  // 5. Query paginated article content rows
  const sortClause = sort === 'popular'
    ? [desc(content.viewCount), desc(content.publishedAt)]
    : [desc(content.publishedAt), desc(content.id)];

  const matchedArticles = await db
    .select({
      id: content.id,
      categoryId: content.categoryId,
      authorName: content.authorName,
      coverImage: content.coverImage,
      pdfEnabled: content.pdfEnabled,
      viewCount: content.viewCount,
      publishedAt: content.publishedAt,
      catId: categories.id,
      catSlug: categories.slug,
      catNameEn: categories.nameEn,
      catNameAm: categories.nameAm,
      catNameOm: categories.nameOm,
      catNameTi: categories.nameTi,
    })
    .from(content)
    .innerJoin(categories, eq(content.categoryId, categories.id))
    .where(whereClause)
    .orderBy(...sortClause)
    .limit(limit)
    .offset(offset);

  const contentIds = matchedArticles.map((a) => a.id);

  // 6. Batch fetch all translations for matched articles
  const allTranslations = await db
    .select()
    .from(contentTranslations)
    .where(inArray(contentTranslations.contentId, contentIds));

  // Map translations by contentId
  const translationsByContent = new Map<number, typeof contentTranslations.$inferSelect[]>();
  for (const trans of allTranslations) {
    const list = translationsByContent.get(trans.contentId) || [];
    list.push(trans);
    translationsByContent.set(trans.contentId, list);
  }

  // 7. Batch fetch tags for matched articles
  const articleTagsRows = await db
    .select({
      contentId: contentTags.contentId,
      tagId: tags.id,
      tagSlug: tags.slug,
      tagName: tags.name,
    })
    .from(contentTags)
    .innerJoin(tags, eq(contentTags.tagId, tags.id))
    .where(inArray(contentTags.contentId, contentIds));

  const tagsByContent = new Map<number, Array<{ id: number; slug: string; name: string }>>();
  for (const row of articleTagsRows) {
    const list = tagsByContent.get(row.contentId) || [];
    list.push({ id: row.tagId, slug: row.tagSlug, name: row.tagName });
    tagsByContent.set(row.contentId, list);
  }

  // 8. Assemble localized items with smart fallback
  const items: ArticleListItem[] = matchedArticles.map((article) => {
    const translations = translationsByContent.get(article.id) || [];
    
    // Attempt requested language
    let chosen = translations.find((t) => t.langCode.toLowerCase() === lang);
    let isFallback = false;

    // Fallback to Amharic if requested lang is not found
    if (!chosen) {
      chosen = translations.find((t) => t.langCode.toLowerCase() === 'am');
      if (chosen) {
        isFallback = true;
      }
    }

    // Fallback to first available translation if neither requested nor Amharic exists
    if (!chosen && translations.length > 0) {
      chosen = translations[0];
      isFallback = true;
    }

    const localizedCategoryName = getLocalizedCategoryName(
      {
        nameAm: article.catNameAm,
        nameEn: article.catNameEn,
        nameOm: article.catNameOm,
        nameTi: article.catNameTi,
        slug: article.catSlug,
      },
      lang
    );

    return {
      id: article.id,
      slug: chosen?.slug || `article-${article.id}`,
      title: chosen?.title || 'Untitled',
      summary: chosen?.summary || null,
      authorName: article.authorName,
      coverImage: article.coverImage,
      pdfEnabled: article.pdfEnabled,
      viewCount: article.viewCount,
      publishedAt: article.publishedAt,
      langCode: chosen?.langCode || lang,
      isFallback,
      category: {
        id: article.catId,
        slug: article.catSlug,
        name: localizedCategoryName,
      },
      tags: tagsByContent.get(article.id) || [],
    };
  });

  return {
    success: true,
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      timestamp: new Date().toISOString(),
      lang,
      category: categorySlug,
      tag: tagSlug,
      sort,
    },
  };
}

/**
 * Get latest articles feed for homepage hero/grid
 * GET /api/v1/articles/latest?lang=am&limit=6
 */
export async function getLatestArticles(req: Request, res: Response) {
  req.query.sort = 'latest';
  req.query.page = '1';
  if (!req.query.limit) {
    req.query.limit = '6';
  }
  return getArticles(req, res);
}

/**
 * Get full article detail with smart multilingual fallback, citations, media, and tag relations
 * GET /api/v1/articles/:slug?lang=am
 */
export async function getArticleBySlug(req: Request, _res: Response) {
  const rawSlug = req.params.slug;
  const slugParam = (typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '')?.trim();
  const requestedLang = (typeof req.query.lang === 'string' ? req.query.lang : 'am').toLowerCase();

  if (!slugParam) {
    throw new NotFoundError('Article slug is required');
  }

  // 1. Resolve content translation by slug or ID
  let contentId: number | null = null;

  // Check if slug matches any translation
  const matchedTranslation = await db
    .select()
    .from(contentTranslations)
    .where(eq(contentTranslations.slug, slugParam))
    .limit(1);

  if (matchedTranslation.length > 0) {
    contentId = matchedTranslation[0].contentId;
  } else {
    // If slug is numeric ID
    const numericId = parseInt(slugParam, 10);
    if (!isNaN(numericId) && String(numericId) === slugParam) {
      contentId = numericId;
    }
  }

  if (!contentId) {
    throw new NotFoundError(`Article not found: ${slugParam}`);
  }

  // 2. Fetch parent content and category (verify published status)
  const articleRows = await db
    .select({
      id: content.id,
      categoryId: content.categoryId,
      authorName: content.authorName,
      coverImage: content.coverImage,
      pdfEnabled: content.pdfEnabled,
      viewCount: content.viewCount,
      status: content.status,
      publishedAt: content.publishedAt,
      updatedAt: content.updatedAt,
      catId: categories.id,
      catSlug: categories.slug,
      catNameEn: categories.nameEn,
      catNameAm: categories.nameAm,
      catNameOm: categories.nameOm,
      catNameTi: categories.nameTi,
    })
    .from(content)
    .innerJoin(categories, eq(content.categoryId, categories.id))
    .where(and(eq(content.id, contentId), eq(content.status, 'published')))
    .limit(1);

  if (articleRows.length === 0) {
    throw new NotFoundError(`Article not found or not published: ${slugParam}`);
  }

  const article = articleRows[0];

  // 3. Fetch all translations for this article
  const translations = await db
    .select()
    .from(contentTranslations)
    .where(eq(contentTranslations.contentId, contentId));

  if (translations.length === 0) {
    throw new NotFoundError(`No translation content found for article: ${contentId}`);
  }

  // 4. Resolve translation with smart fallback
  let chosenTranslation = translations.find((t) => t.langCode.toLowerCase() === requestedLang);
  let isFallback = false;
  let fallbackFrom: string | undefined;

  if (!chosenTranslation) {
    // Fall back to Amharic
    chosenTranslation = translations.find((t) => t.langCode.toLowerCase() === 'am');
    if (chosenTranslation) {
      isFallback = true;
      fallbackFrom = requestedLang;
    }
  }

  if (!chosenTranslation) {
    // Fall back to first available
    chosenTranslation = translations[0];
    isFallback = true;
    fallbackFrom = requestedLang;
  }

  // 5. Fetch supplementary media
  const mediaRows = await db
    .select({
      id: contentMedia.id,
      mediaKind: contentMedia.mediaKind,
      platform: contentMedia.platform,
      embedId: contentMedia.embedId,
      caption: contentMedia.caption,
    })
    .from(contentMedia)
    .where(eq(contentMedia.contentId, contentId))
    .orderBy(asc(contentMedia.sortOrder), asc(contentMedia.id));

  // 6. Fetch associated tags
  const tagRows = await db
    .select({
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
    })
    .from(contentTags)
    .innerJoin(tags, eq(contentTags.tagId, tags.id))
    .where(eq(contentTags.contentId, contentId))
    .orderBy(asc(tags.name));

  // 7. Extract scripture citations
  const citations = extractScriptureCitations(chosenTranslation.body);

  // 8. Available translations list
  const availableTranslations = translations.map((t) => ({
    langCode: t.langCode,
    slug: t.slug,
    title: t.title,
  }));

  // 9. Localized Category Name
  const localizedCategoryName = getLocalizedCategoryName(
    {
      nameAm: article.catNameAm,
      nameEn: article.catNameEn,
      nameOm: article.catNameOm,
      nameTi: article.catNameTi,
      slug: article.catSlug,
    },
    chosenTranslation.langCode
  );

  // 10. Cache slug-to-ID mappings in memory for fast O(1) view tracking on cache HITs
  recordSlugIdMapping(slugParam, article.id);
  recordSlugIdMapping(chosenTranslation.slug, article.id);

  const responseData: ArticleDetailResponse = {
    id: article.id,
    categoryId: article.categoryId,
    category: {
      id: article.catId,
      slug: article.catSlug,
      name: localizedCategoryName,
    },
    authorName: article.authorName,
    coverImage: article.coverImage,
    pdfEnabled: article.pdfEnabled,
    viewCount: article.viewCount,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    langCode: chosenTranslation.langCode,
    isFallback,
    fallbackFrom,
    title: chosenTranslation.title,
    slug: chosenTranslation.slug,
    summary: chosenTranslation.summary,
    body: chosenTranslation.body,
    pdfFilePath: chosenTranslation.pdfFilePath,
    citations,
    tags: tagRows,
    media: mediaRows,
    availableTranslations,
  };

  return {
    success: true,
    data: responseData,
    meta: {
      timestamp: new Date().toISOString(),
      lang: chosenTranslation.langCode,
      isFallback,
      fallbackFrom,
    },
  };
}
