export type SupportedLanguage = 'am' | 'en' | 'om' | 'ti';

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  cached?: boolean;
  timestamp: string;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: ResponseMeta;
}

export interface CategoryDTO {
  id: number;
  slug: string;
  nameEn: string;
  nameAm: string | null;
  nameOm: string | null;
  nameTi: string | null;
  descriptionEn: string | null;
  descriptionAm: string | null;
  descriptionOm: string | null;
  descriptionTi: string | null;
  sortOrder: number;
  articleCount?: number;
}

export interface ArticleQueryFilter {
  lang?: SupportedLanguage;
  category?: string;
  tag?: string;
  page?: number;
  limit?: number;
  sort?: 'latest' | 'popular';
}

export interface ContentMediaDTO {
  id: number;
  contentId: number;
  mediaKind: 'video' | 'audio';
  platform: 'youtube' | 'vimeo' | 'soundcloud' | 'self-hosted';
  embedId: string;
  caption: string | null;
  sortOrder: number;
}

export interface TagDTO {
  id: number;
  slug: string;
  name: string;
  articleCount?: number;
}

// ── B6 Public API Response DTOs ──────────────────────────────────

/** Category with localized name/description (resolved by requested lang) */
export interface CategoryListItem {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  articleCount: number;
}

/** Article feed card (lightweight, no body) */
export interface ArticleFeedItem {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  coverImage: string | null;
  authorName: string | null;
  categorySlug: string;
  categoryName: string;
  langCode: string;
  publishedAt: string | null;
  viewCount: number;
  tags: Array<{ slug: string; name: string }>;
}

/** Single article detail (full body + fallback metadata) */
export interface ArticleDetailResponse {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  coverImage: string | null;
  authorName: string | null;
  categorySlug: string;
  categoryName: string;
  langCode: string;
  isFallback: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
  viewCount: number;
  pdfEnabled: boolean;
  availableLanguages: string[];
  media: ContentMediaDTO[];
  tags: Array<{ slug: string; name: string }>;
}

/** Daily lectionary response */
export interface DailyLectionaryResponse {
  date: string;
  message: string;
  lang: string;
}
