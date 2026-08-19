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
import { ValidatedRequest } from '../validators/queryValidator.js';
import {
  ArticleFeedQueryParams,
  LatestArticlesQueryParams,
  ArticleDetailQueryParams,
  ArticleSlugParams,
} from '../validators/publicQueryValidator.js';

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
  const query = (req as ValidatedRequest<ArticleFeedQueryParams>).validatedQuery || {
    lang: 'am',
    page: 1,
    limit: 12,
    sort: 'latest',
  };
  const { lang, category, tag, page, limit, sort } = query;
  const offset = (page - 1) * limit;

  // Build conditions for published articles using SQL EXISTS for category and tag
  const conditions = [eq(content.status, 'published')];

  if (category) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${categories} WHERE ${categories.id} = ${content.categoryId} AND ${categories.slug} = ${category})`
    );
  }

  if (tag) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${contentTags}
        INNER JOIN ${tags} ON ${contentTags.tagId} = ${tags.id}
        WHERE ${contentTags.contentId} = ${content.id} AND ${tags.slug} = ${tag}
      )`
    );
  }

  const whereClause = and(...conditions);

  const sortClause = sort === 'popular'
    ? [desc(content.viewCount), desc(content.publishedAt)]
    : [desc(content.publishedAt), desc(content.id)];

  // Run COUNT(*) and paginated list queries in Promise.all
  const [countRows, matchedArticles] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(content)
      .where(whereClause),
    db
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
      .offset(offset),
  ]);

  const total = Number(countRows[0]?.count || 0);
  const totalPages = Math.ceil(total / limit) || 0;

  if (total === 0 || matchedArticles.length === 0) {
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
        category,
        tag,
        sort,
      },
    };
  }

  const contentIds = matchedArticles.map((a) => a.id);

  // Batch fetch translations and tags for matched articles in parallel
  const [allTranslations, articleTagsRows] = await Promise.all([
    db
      .select()
      .from(contentTranslations)
      .where(inArray(contentTranslations.contentId, contentIds)),
    db
      .select({
        contentId: contentTags.contentId,
        tagId: tags.id,
        tagSlug: tags.slug,
        tagName: tags.name,
      })
      .from(contentTags)
      .innerJoin(tags, eq(contentTags.tagId, tags.id))
      .where(inArray(contentTags.contentId, contentIds)),
  ]);

  const translationsByContent = new Map<number, typeof contentTranslations.$inferSelect[]>();
  for (const trans of allTranslations) {
    const list = translationsByContent.get(trans.contentId) || [];
    list.push(trans);
    translationsByContent.set(trans.contentId, list);
  }

  const tagsByContent = new Map<number, Array<{ id: number; slug: string; name: string }>>();
  for (const row of articleTagsRows) {
    const list = tagsByContent.get(row.contentId) || [];
    list.push({ id: row.tagId, slug: row.tagSlug, name: row.tagName });
    tagsByContent.set(row.contentId, list);
  }

  // Assemble localized items with smart fallback
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
      category,
      tag,
      sort,
    },
  };
}

/**
 * Get latest articles feed for homepage hero/grid
 * GET /api/v1/articles/latest?lang=am&limit=6
 */
export async function getLatestArticles(req: Request, _res: Response) {
  const query = (req as ValidatedRequest<LatestArticlesQueryParams>).validatedQuery || {
    lang: 'am',
    limit: 6,
  };
  const { lang, limit } = query;

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
    .where(eq(content.status, 'published'))
    .orderBy(desc(content.publishedAt), desc(content.id))
    .limit(limit);

  if (matchedArticles.length === 0) {
    return {
      success: true,
      data: [],
      meta: {
        limit,
        count: 0,
        timestamp: new Date().toISOString(),
        lang,
      },
    };
  }

  const contentIds = matchedArticles.map((a) => a.id);

  const [allTranslations, articleTagsRows] = await Promise.all([
    db
      .select()
      .from(contentTranslations)
      .where(inArray(contentTranslations.contentId, contentIds)),
    db
      .select({
        contentId: contentTags.contentId,
        tagId: tags.id,
        tagSlug: tags.slug,
        tagName: tags.name,
      })
      .from(contentTags)
      .innerJoin(tags, eq(contentTags.tagId, tags.id))
      .where(inArray(contentTags.contentId, contentIds)),
  ]);

  const translationsByContent = new Map<number, typeof contentTranslations.$inferSelect[]>();
  for (const trans of allTranslations) {
    const list = translationsByContent.get(trans.contentId) || [];
    list.push(trans);
    translationsByContent.set(trans.contentId, list);
  }

  const tagsByContent = new Map<number, Array<{ id: number; slug: string; name: string }>>();
  for (const row of articleTagsRows) {
    const list = tagsByContent.get(row.contentId) || [];
    list.push({ id: row.tagId, slug: row.tagSlug, name: row.tagName });
    tagsByContent.set(row.contentId, list);
  }

  const items: ArticleListItem[] = matchedArticles.map((article) => {
    const translations = translationsByContent.get(article.id) || [];
    let chosen = translations.find((t) => t.langCode.toLowerCase() === lang);
    let isFallback = false;

    if (!chosen) {
      chosen = translations.find((t) => t.langCode.toLowerCase() === 'am');
      if (chosen) {
        isFallback = true;
      }
    }

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
      limit,
      count: items.length,
      timestamp: new Date().toISOString(),
      lang,
    },
  };
}

/**
 * Get full article detail with smart multilingual fallback, citations, media, and tag relations
 * GET /api/v1/articles/:slug?lang=am
 */
export async function getArticleBySlug(req: Request, _res: Response) {
  const params = (req as ValidatedRequest<any, ArticleSlugParams>).validatedParams || req.params;
  const query = (req as ValidatedRequest<ArticleDetailQueryParams>).validatedQuery || { lang: 'am' };

  const slugParam = String(params.slug || req.params.slug || '').trim();
  const requestedLang = query.lang || 'am';

  if (!slugParam) {
    throw new NotFoundError('Article slug is required');
  }

  // 1. Resolve content translation by slug or ID
  let contentId: number | null = null;

  const matchedTranslation = await db
    .select({ contentId: contentTranslations.contentId })
    .from(contentTranslations)
    .where(eq(contentTranslations.slug, slugParam))
    .limit(1);

  if (matchedTranslation.length > 0) {
    contentId = matchedTranslation[0].contentId;
  } else {
    const numericId = parseInt(slugParam, 10);
    if (!isNaN(numericId) && String(numericId) === slugParam) {
      contentId = numericId;
    }
  }

  if (!contentId) {
    throw new NotFoundError(`Article not found: ${slugParam}`);
  }

  // 2. Parallelize queries for parent container, all translations, media, and tags
  const [articleRows, translations, mediaRows, tagRows] = await Promise.all([
    db
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
      .limit(1),
    db
      .select()
      .from(contentTranslations)
      .where(eq(contentTranslations.contentId, contentId)),
    db
      .select({
        id: contentMedia.id,
        mediaKind: contentMedia.mediaKind,
        platform: contentMedia.platform,
        embedId: contentMedia.embedId,
        caption: contentMedia.caption,
      })
      .from(contentMedia)
      .where(eq(contentMedia.contentId, contentId))
      .orderBy(asc(contentMedia.sortOrder), asc(contentMedia.id)),
    db
      .select({
        id: tags.id,
        slug: tags.slug,
        name: tags.name,
      })
      .from(contentTags)
      .innerJoin(tags, eq(contentTags.tagId, tags.id))
      .where(eq(contentTags.contentId, contentId))
      .orderBy(asc(tags.name)),
  ]);

  if (articleRows.length === 0) {
    throw new NotFoundError(`Article not found or not published: ${slugParam}`);
  }

  if (translations.length === 0) {
    throw new NotFoundError(`No translation content found for article: ${contentId}`);
  }

  const article = articleRows[0];

  // 3. Resolve translation with smart fallback
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

  // 4. Extract scripture citations
  const citations = extractScriptureCitations(chosenTranslation.body);

  // 5. Available translations list
  const availableTranslations = translations.map((t) => ({
    langCode: t.langCode,
    slug: t.slug,
    title: t.title,
  }));

  // 6. Localized Category Name
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

  // 7. Cache slug-to-ID mappings in memory for fast O(1) view tracking on cache HITs
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
