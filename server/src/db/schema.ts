import {
  mysqlTable,
  int,
  varchar,
  text,
  mediumtext,
  tinyint,
  timestamp,
  mysqlEnum,
  uniqueIndex,
  index,
  primaryKey
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. CATEGORIES TABLE
// ==========================================
export const categories = mysqlTable('categories', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // 'christianity', 'islamic', 'testimonies', 'atheism', 'spiritual-teachings'
  nameEn: varchar('name_en', { length: 150 }).notNull(), // English
  nameAm: varchar('name_am', { length: 150 }), // Amharic
  nameOm: varchar('name_om', { length: 150 }), // Afan Oromo
  nameTi: varchar('name_ti', { length: 150 }), // Tigrigna
  descriptionEn: text('description_en'),
  descriptionAm: text('description_am'),
  descriptionOm: text('description_om'),
  descriptionTi: text('description_ti'),
  sortOrder: int('sort_order').default(0),
  isActive: tinyint('is_active').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==========================================
// 2. CORE CONTENT (ARTICLES) TABLE
// ==========================================
export const content = mysqlTable('content', {
  id: int('id').autoincrement().primaryKey(),
  categoryId: int('category_id').notNull().references(() => categories.id),
  authorName: varchar('author_name', { length: 150 }),
  coverImage: varchar('cover_image', { length: 255 }),
  status: mysqlEnum('status', ['draft', 'published', 'archived']).default('draft'),
  
  // PDF Export Metadata
  pdfEnabled: tinyint('pdf_enabled').default(0),
  pdfFilePath: varchar('pdf_file_path', { length: 255 }),
  pdfGeneratedAt: timestamp('pdf_generated_at'),
  
  viewCount: int('view_count').default(0),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => [
  index('idx_category').on(table.categoryId),
  index('idx_status_published').on(table.status, table.publishedAt),
]);

// ==========================================
// 3. CONTENT TRANSLATIONS TABLE
// ==========================================
export const contentTranslations = mysqlTable('content_translations', {
  id: int('id').autoincrement().primaryKey(),
  contentId: int('content_id').notNull().references(() => content.id, { onDelete: 'cascade' }),
  langCode: varchar('lang_code', { length: 5 }).notNull(), // 'en', 'am', 'om', 'ti'
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  summary: text('summary'),
  body: mediumtext('body').notNull(), // Full Sanitized HTML (up to 16MB)
  bodySearchable: text('body_searchable').notNull(), // Stripped Plain Text (for FULLTEXT compliance)
}, (table) => [
  uniqueIndex('uniq_content_lang').on(table.contentId, table.langCode),
  uniqueIndex('uniq_slug_lang').on(table.slug, table.langCode),
  index('idx_search_title').on(table.title),
]);

// ==========================================
// 4. SUPPLEMENTARY MEDIA TABLE
// ==========================================
export const contentMedia = mysqlTable('content_media', {
  id: int('id').autoincrement().primaryKey(),
  contentId: int('content_id').notNull().references(() => content.id, { onDelete: 'cascade' }),
  mediaKind: mysqlEnum('media_kind', ['video', 'audio']).notNull(),
  platform: varchar('platform', { length: 50 }).notNull(), // 'youtube', 'vimeo', 'soundcloud', 'self-hosted'
  embedId: varchar('embed_id', { length: 255 }).notNull(),
  caption: varchar('caption', { length: 255 }),
  sortOrder: int('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_content').on(table.contentId),
]);

// ==========================================
// 5. TAGS & CONTENT_TAGS TABLES
// ==========================================
export const tags = mysqlTable('tags', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const contentTags = mysqlTable('content_tags', {
  contentId: int('content_id').notNull().references(() => content.id, { onDelete: 'cascade' }),
  tagId: int('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.contentId, table.tagId] }),
]);

// ==========================================
// 6. RELATIONS
// ==========================================
export const categoriesRelations = relations(categories, ({ many }) => ({
  contents: many(content),
}));

export const contentRelations = relations(content, ({ one, many }) => ({
  category: one(categories, {
    fields: [content.categoryId],
    references: [categories.id],
  }),
  translations: many(contentTranslations),
  media: many(contentMedia),
  contentTags: many(contentTags),
}));

export const contentTranslationsRelations = relations(contentTranslations, ({ one }) => ({
  content: one(content, {
    fields: [contentTranslations.contentId],
    references: [content.id],
  }),
}));

export const contentMediaRelations = relations(contentMedia, ({ one }) => ({
  content: one(content, {
    fields: [contentMedia.contentId],
    references: [content.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  contentTags: many(contentTags),
}));

export const contentTagsRelations = relations(contentTags, ({ one }) => ({
  content: one(content, {
    fields: [contentTags.contentId],
    references: [content.id],
  }),
  tag: one(tags, {
    fields: [contentTags.tagId],
    references: [tags.id],
  }),
}));
