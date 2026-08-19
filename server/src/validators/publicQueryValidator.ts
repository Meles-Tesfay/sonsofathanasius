import { z } from 'zod';

export const LangParam = z.enum(['am', 'en', 'om', 'ti']).default('am');

export const CategoryQuerySchema = z.object({
  lang: LangParam,
});

export const TagQuerySchema = z.object({
  lang: LangParam,
});

export const ArticleFeedQuerySchema = z.object({
  lang: LangParam,
  category: z.string().max(100).regex(/^[a-z0-9-]+$/).optional(),
  tag: z.string().max(100).regex(/^[a-z0-9-]+$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(['latest', 'popular']).default('latest'),
});

export const LatestArticlesQuerySchema = z.object({
  lang: LangParam,
  limit: z.coerce.number().int().min(1).max(20).default(6),
});

export const ArticleDetailQuerySchema = z.object({
  lang: LangParam,
});

export const ArticleSlugParamSchema = z.object({
  slug: z.string().min(1).max(200),
});

export const DailyQuerySchema = z.object({
  lang: LangParam,
});

export const PdfQuerySchema = z.object({
  lang: LangParam,
});

export type CategoryQueryParams = z.infer<typeof CategoryQuerySchema>;
export type TagQueryParams = z.infer<typeof TagQuerySchema>;
export type ArticleFeedQueryParams = z.infer<typeof ArticleFeedQuerySchema>;
export type LatestArticlesQueryParams = z.infer<typeof LatestArticlesQuerySchema>;
export type ArticleDetailQueryParams = z.infer<typeof ArticleDetailQuerySchema>;
export type ArticleSlugParams = z.infer<typeof ArticleSlugParamSchema>;
export type DailyQueryParams = z.infer<typeof DailyQuerySchema>;
export type PdfQueryParams = z.infer<typeof PdfQuerySchema>;
