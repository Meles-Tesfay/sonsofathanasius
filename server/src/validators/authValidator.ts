import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════
// B7.1: Admin Auth Login Schema
// ══════════════════════════════════════════════════════════════════

export const LoginSchema = z.object({
  login: z.string().min(2).max(255),           // username OR email
  password: z.string().min(6).max(128),
});
export type LoginPayload = z.infer<typeof LoginSchema>;

// ══════════════════════════════════════════════════════════════════
// B7.2: Atomic Article Creation Schema
// ══════════════════════════════════════════════════════════════════

const TranslationInputSchema = z.object({
  langCode: z.enum(['am', 'en', 'om', 'ti']),
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  summary: z.string().max(5000).optional().nullable(),
  body: z.string().min(1),                     // Raw HTML from TipTap editor
});

const MediaInputSchema = z.object({
  mediaKind: z.enum(['video', 'audio']),
  platform: z.string().max(50),
  embedId: z.string().max(255),
  caption: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const CreateArticleSchema = z.object({
  categoryId: z.number().int().positive(),
  authorName: z.string().max(150).optional().nullable(),
  coverImage: z.string().max(255).optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  pdfEnabled: z.boolean().default(false),
  publishedAt: z.string().datetime().optional().nullable(),
  translations: z.array(TranslationInputSchema).min(1),
  media: z.array(MediaInputSchema).optional().default([]),
  tagIds: z.array(z.number().int().positive()).optional().default([]),
});
export type CreateArticlePayload = z.infer<typeof CreateArticleSchema>;

// ══════════════════════════════════════════════════════════════════
// B7.3: Translation UPSERT Schema
// ══════════════════════════════════════════════════════════════════

export const UpsertTranslationSchema = z.object({
  langCode: z.enum(['am', 'en', 'om', 'ti']),
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  summary: z.string().max(5000).optional().nullable(),
  body: z.string().min(1),
});
export type UpsertTranslationPayload = z.infer<typeof UpsertTranslationSchema>;

// ══════════════════════════════════════════════════════════════════
// B7.4: Article Update Schema
// ══════════════════════════════════════════════════════════════════

export const UpdateArticleSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  authorName: z.string().max(150).optional().nullable(),
  coverImage: z.string().max(255).optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  pdfEnabled: z.boolean().optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  translations: z.array(TranslationInputSchema).optional(),
  media: z.array(MediaInputSchema).optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
});
export type UpdateArticlePayload = z.infer<typeof UpdateArticleSchema>;
