import { z } from 'zod';

// ── Shared language enum (Amharic-first platform) ──
const LangParam = z.enum(['am', 'en', 'om', 'ti']).default('am');

// ── B6.1: GET /api/v1/categories?lang=am ──
export const CategoryQuerySchema = z.object({
  lang: LangParam,
});
export type CategoryQueryParams = z.infer<typeof CategoryQuerySchema>;

// ── B6.2: GET /api/v1/tags?lang=am ──
export const TagQuerySchema = z.object({
  lang: LangParam,
});
export type TagQueryParams = z.infer<typeof TagQuerySchema>;

// ── B6.3: GET /api/v1/articles?category={slug}&tag={slug}&page=1&limit=12&lang=am ──
export const ArticleFeedQuerySchema = z.object({
  lang: LangParam,
  category: z.string().max(100).optional(),
  tag: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(['latest', 'popular']).default('latest'),
});
export type ArticleFeedQueryParams = z.infer<typeof ArticleFeedQuerySchema>;

// ── B6.3: GET /api/v1/articles/latest?lang=am ──
export const LatestArticlesQuerySchema = z.object({
  lang: LangParam,
  limit: z.coerce.number().int().min(1).max(20).default(6),
});
export type LatestArticlesQueryParams = z.infer<typeof LatestArticlesQuerySchema>;

// ── B6.4: GET /api/v1/articles/:slug?lang=am ──
export const ArticleDetailQuerySchema = z.object({
  lang: LangParam,
});
export type ArticleDetailQueryParams = z.infer<typeof ArticleDetailQuerySchema>;

// ── B6.5: GET /api/v1/daily?lang=am ──
export const DailyQuerySchema = z.object({
  lang: LangParam,
});
export type DailyQueryParams = z.infer<typeof DailyQuerySchema>;
