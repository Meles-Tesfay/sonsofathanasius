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
