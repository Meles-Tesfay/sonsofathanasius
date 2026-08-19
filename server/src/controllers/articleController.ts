import { Request, Response } from 'express';
import { ValidatedRequest } from '../validators/queryValidator.js';
import {
  ArticleFeedQueryParams,
  LatestArticlesQueryParams,
  ArticleDetailQueryParams,
} from '../validators/publicQueryValidator.js';
import { db } from '../db/index.js';
import {
  content,
  contentTranslations,
  categories,
  contentMedia,
  contentTags,
  tags,
} from '../db/schema.js';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { trackArticleView } from '../cache/viewCounter.js';
import { sendError } from '../utils/response.js';
import type {
  SupportedLanguage,
  ArticleFeedItem,
  ArticleDetailResponse,
} from '../types/index.js';

// ── Helper: Resolve localized category name ─────────────────────
function resolveCategoryName(
  row: {
    categoryNameEn: string;
    categoryNameAm: string | null;
    categoryNameOm: string | null;
    categoryNameTi: string | null;
  },
  lang: SupportedLanguage
): string {
  const map: Record<SupportedLanguage, string | null> = {
    am: row.categoryNameAm,
    en: row.categoryNameEn,
    om: row.categoryNameOm,
    ti: row.categoryNameTi,
  };
  return map[lang] ?? row.categoryNameEn;
}

// ── Helper: Fetch tags for a list of content IDs ────────────────
async function fetchTagsForContentIds(
  contentIds: number[]
): Promise<Map<number, Array<{ slug: string; name: string }>>> {
  const tagMap = new Map<number, Array<{ slug: string; name: string }>>();
  if (contentIds.length === 0) return tagMap;

  const rows = await db
    .select({
      contentId: contentTags.contentId,
      slug: tags.slug,
      name: tags.name,
    })
    .from(contentTags)
    .innerJoin(tags, eq(tags.id, contentTags.tagId))
    .where(inArray(contentTags.contentId, contentIds));

  for (const row of rows) {
    const existing = tagMap.get(row.contentId) ?? [];
    existing.push({ slug: row.slug, name: row.name });
    tagMap.set(row.contentId, existing);
  }

  return tagMap;
}

// ══════════════════════════════════════════════════════════════════
// 1. ARTICLE FEED — GET /api/v1/articles
// ══════════════════════════════════════════════════════════════════

/**
 * Paginated article feed with optional category/tag filtering.
 * Returns raw envelope for cachedRoute().
 */
export async function getArticleFeed(
  req: ValidatedRequest<ArticleFeedQueryParams>,
  _res: Response
): Promise<unknown> {
  const { lang, category, tag, page, limit, sort } = req.validatedQuery!;
  const offset = (page - 1) * limit;

  // ── Build WHERE conditions ──
  const conditions = [
    eq(content.status, 'published'),
    eq(contentTranslations.langCode, lang),
  ];

  if (category) {
    conditions.push(eq(categories.slug, category));
  }

  // ── Build base query ──
  const baseQuery = db
    .select({
      id: content.id,
      slug: contentTranslations.slug,
      title: contentTranslations.title,
      summary: contentTranslations.summary,
      coverImage: content.coverImage,
      authorName: content.authorName,
      categorySlug: categories.slug,
      categoryNameEn: categories.nameEn,
      categoryNameAm: categories.nameAm,
      categoryNameOm: categories.nameOm,
      categoryNameTi: categories.nameTi,
      langCode: contentTranslations.langCode,
      publishedAt: content.publishedAt,
      viewCount: content.viewCount,
    })
    .from(content)
    .innerJoin(contentTranslations, eq(contentTranslations.contentId, content.id))
    .innerJoin(categories, eq(categories.id, content.categoryId))
    .where(and(...conditions));

  // ── Tag filtering via EXISTS subquery ──
  // If tag filter is provided, wrap with an additional filter
  let filteredQuery = baseQuery;
  if (tag) {
    const tagSubquery = db
      .select({ contentId: contentTags.contentId })
      .from(contentTags)
      .innerJoin(tags, eq(tags.id, contentTags.tagId))
      .where(and(
        eq(tags.slug, tag),
        eq(contentTags.contentId, content.id)
      ));

    conditions.push(sql`EXISTS (${tagSubquery})`);

    // Rebuild with tag condition
    filteredQuery = db
      .select({
        id: content.id,
        slug: contentTranslations.slug,
        title: contentTranslations.title,
        summary: contentTranslations.summary,
        coverImage: content.coverImage,
        authorName: content.authorName,
        categorySlug: categories.slug,
        categoryNameEn: categories.nameEn,
        categoryNameAm: categories.nameAm,
        categoryNameOm: categories.nameOm,
        categoryNameTi: categories.nameTi,
        langCode: contentTranslations.langCode,
        publishedAt: content.publishedAt,
        viewCount: content.viewCount,
      })
      .from(content)
      .innerJoin(contentTranslations, eq(contentTranslations.contentId, content.id))
      .innerJoin(categories, eq(categories.id, content.categoryId))
      .where(and(...conditions));
  }

  // ── Sorting ──
  const orderColumn = sort === 'popular' ? content.viewCount : content.publishedAt;

  // ── Execute data + count queries in parallel ──
  const [rows, countResult] = await Promise.all([
    filteredQuery
      .orderBy(desc(orderColumn))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)`.as('count') })
      .from(content)
      .innerJoin(contentTranslations, eq(contentTranslations.contentId, content.id))
      .innerJoin(categories, eq(categories.id, content.categoryId))
      .where(and(...conditions)),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // ── Fetch tags for all articles in batch ──
  const contentIds = rows.map((r) => r.id);
  const tagMap = await fetchTagsForContentIds(contentIds);

  // ── Map to ArticleFeedItem ──
  const articles: ArticleFeedItem[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverImage: row.coverImage,
    authorName: row.authorName,
    categorySlug: row.categorySlug,
    categoryName: resolveCategoryName(row, lang),
    langCode: row.langCode,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    viewCount: row.viewCount ?? 0,
    tags: tagMap.get(row.id) ?? [],
  }));

  return {
    success: true,
    data: articles,
    meta: {
      page,
      limit,
      total,
      totalPages,
      lang,
      category: category || null,
      tag: tag || null,
      sort,
      timestamp: new Date().toISOString(),
    },
  };
}

// ══════════════════════════════════════════════════════════════════
// 2. LATEST ARTICLES — GET /api/v1/articles/latest
// ══════════════════════════════════════════════════════════════════

/**
 * Returns the N most recently published articles.
 * Returns raw envelope for cachedRoute().
 */
export async function getLatestArticles(
  req: ValidatedRequest<LatestArticlesQueryParams>,
  _res: Response
): Promise<unknown> {
  const { lang, limit } = req.validatedQuery!;

  const rows = await db
    .select({
      id: content.id,
      slug: contentTranslations.slug,
      title: contentTranslations.title,
      summary: contentTranslations.summary,
      coverImage: content.coverImage,
      authorName: content.authorName,
      categorySlug: categories.slug,
      categoryNameEn: categories.nameEn,
      categoryNameAm: categories.nameAm,
      categoryNameOm: categories.nameOm,
      categoryNameTi: categories.nameTi,
      langCode: contentTranslations.langCode,
      publishedAt: content.publishedAt,
      viewCount: content.viewCount,
    })
    .from(content)
    .innerJoin(contentTranslations, eq(contentTranslations.contentId, content.id))
    .innerJoin(categories, eq(categories.id, content.categoryId))
    .where(
      and(
        eq(content.status, 'published'),
        eq(contentTranslations.langCode, lang)
      )
    )
    .orderBy(desc(content.publishedAt))
    .limit(limit);

  // Fetch tags in batch
  const contentIds = rows.map((r) => r.id);
  const tagMap = await fetchTagsForContentIds(contentIds);

  const articles: ArticleFeedItem[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverImage: row.coverImage,
    authorName: row.authorName,
    categorySlug: row.categorySlug,
    categoryName: resolveCategoryName(row, lang),
    langCode: row.langCode,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    viewCount: row.viewCount ?? 0,
    tags: tagMap.get(row.id) ?? [],
  }));

  return {
    success: true,
    data: articles,
    meta: {
      total: articles.length,
      lang,
      timestamp: new Date().toISOString(),
    },
  };
}

// ══════════════════════════════════════════════════════════════════
// 3. SINGLE ARTICLE DETAIL — GET /api/v1/articles/:slug
//    With Smart Multilingual Fallback
// ══════════════════════════════════════════════════════════════════

/**
 * Fetch a single article by slug with Smart Fallback logic:
 *   1. Try requested lang + slug
 *   2. Fallback to Amharic ('am') + same slug  → isFallback = true
 *   3. Try slug across any language              → isFallback = true
 *   4. Return 404 if nothing found
 *
 * Returns raw envelope for cachedRoute().
 */
export async function getArticleBySlug(
  req: ValidatedRequest<ArticleDetailQueryParams>,
  res: Response
): Promise<unknown> {
  const slug = req.params.slug;
  const { lang } = req.validatedQuery!;

  if (!slug || typeof slug !== 'string') {
    sendError(res, 'Article slug is required', 400);
    return;
  }

  let isFallback = false;
  let translationRow = await fetchTranslationBySlugAndLang(slug, lang);

  // Smart Fallback Step 2: Try Amharic version of the same slug
  if (!translationRow && lang !== 'am') {
    translationRow = await fetchTranslationBySlugAndLang(slug, 'am');
    if (translationRow) isFallback = true;
  }

  // Smart Fallback Step 3: Try any language with this slug
  if (!translationRow) {
    translationRow = await fetchTranslationBySlugAnyLang(slug);
    if (translationRow) isFallback = true;
  }

  // 404 — article does not exist at all
  if (!translationRow) {
    sendError(res, `Article not found: ${slug}`, 404);
    return;
  }

  const contentId = translationRow.contentId;

  // ── Parallel data fetches ──
  const [availableLangs, mediaRows, articleTags] = await Promise.all([
    // Available languages for this article
    db
      .select({ langCode: contentTranslations.langCode })
      .from(contentTranslations)
      .where(eq(contentTranslations.contentId, contentId)),
    // Supplementary media (video/audio embeds)
    db
      .select()
      .from(contentMedia)
      .where(eq(contentMedia.contentId, contentId))
      .orderBy(contentMedia.sortOrder),
    // Tags
    fetchTagsForContentIds([contentId]),
  ]);

  // Fire-and-forget view count tracking (non-blocking)
  trackArticleView(contentId);

  const result: ArticleDetailResponse = {
    id: contentId,
    slug: translationRow.slug,
    title: translationRow.title,
    summary: translationRow.summary,
    body: translationRow.body,
    coverImage: translationRow.coverImage,
    authorName: translationRow.authorName,
    categorySlug: translationRow.categorySlug,
    categoryName: resolveCategoryName(translationRow, isFallback ? translationRow.langCode as SupportedLanguage : lang),
    langCode: translationRow.langCode,
    isFallback,
    publishedAt: translationRow.publishedAt ? translationRow.publishedAt.toISOString() : null,
    updatedAt: translationRow.updatedAt ? translationRow.updatedAt.toISOString() : null,
    viewCount: translationRow.viewCount ?? 0,
    pdfEnabled: translationRow.pdfEnabled === 1,
    availableLanguages: availableLangs.map((r) => r.langCode),
    media: mediaRows.map((m) => ({
      id: m.id,
      contentId: m.contentId,
      mediaKind: m.mediaKind,
      platform: m.platform as 'youtube' | 'vimeo' | 'soundcloud' | 'self-hosted',
      embedId: m.embedId,
      caption: m.caption,
      sortOrder: m.sortOrder ?? 0,
    })),
    tags: articleTags.get(contentId) ?? [],
  };

  return {
    success: true,
    data: result,
    meta: {
      lang: translationRow.langCode,
      requestedLang: lang,
      isFallback,
      timestamp: new Date().toISOString(),
    },
  };
}

// ── Internal: Fetch translation with full article data by slug + lang ──
async function fetchTranslationBySlugAndLang(slug: string, lang: string) {
  const rows = await db
    .select({
      contentId: content.id,
      slug: contentTranslations.slug,
      title: contentTranslations.title,
      summary: contentTranslations.summary,
      body: contentTranslations.body,
      langCode: contentTranslations.langCode,
      coverImage: content.coverImage,
      authorName: content.authorName,
      categorySlug: categories.slug,
      categoryNameEn: categories.nameEn,
      categoryNameAm: categories.nameAm,
      categoryNameOm: categories.nameOm,
      categoryNameTi: categories.nameTi,
      publishedAt: content.publishedAt,
      updatedAt: content.updatedAt,
      viewCount: content.viewCount,
      pdfEnabled: content.pdfEnabled,
    })
    .from(contentTranslations)
    .innerJoin(content, eq(content.id, contentTranslations.contentId))
    .innerJoin(categories, eq(categories.id, content.categoryId))
    .where(
      and(
        eq(contentTranslations.slug, slug),
        eq(contentTranslations.langCode, lang),
        eq(content.status, 'published')
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

// ── Internal: Fetch translation by slug in any language ──
async function fetchTranslationBySlugAnyLang(slug: string) {
  const rows = await db
    .select({
      contentId: content.id,
      slug: contentTranslations.slug,
      title: contentTranslations.title,
      summary: contentTranslations.summary,
      body: contentTranslations.body,
      langCode: contentTranslations.langCode,
      coverImage: content.coverImage,
      authorName: content.authorName,
      categorySlug: categories.slug,
      categoryNameEn: categories.nameEn,
      categoryNameAm: categories.nameAm,
      categoryNameOm: categories.nameOm,
      categoryNameTi: categories.nameTi,
      publishedAt: content.publishedAt,
      updatedAt: content.updatedAt,
      viewCount: content.viewCount,
      pdfEnabled: content.pdfEnabled,
    })
    .from(contentTranslations)
    .innerJoin(content, eq(content.id, contentTranslations.contentId))
    .innerJoin(categories, eq(categories.id, content.categoryId))
    .where(
      and(
        eq(contentTranslations.slug, slug),
        eq(content.status, 'published')
      )
    )
    .limit(1);

  return rows[0] ?? null;
}
