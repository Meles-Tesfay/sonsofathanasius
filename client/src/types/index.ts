export interface Category {
  id: number;
  slug: string;
  nameEn: string;
  nameAm?: string;
  nameOm?: string;
  nameTi?: string;
  descriptionEn?: string;
  descriptionAm?: string;
  descriptionOm?: string;
  descriptionTi?: string;
  sortOrder: number;
  isActive: number;
}

export interface ContentTranslation {
  id: number;
  contentId: number;
  langCode: 'am' | 'en' | 'om' | 'ti';
  title: string;
  slug: string;
  summary?: string;
  body: string;
  bodySearchable: string;
}

export interface ContentMedia {
  id: number;
  contentId: number;
  mediaKind: 'video' | 'audio';
  platform: 'youtube' | 'vimeo' | 'soundcloud' | 'self-hosted';
  embedId: string;
  caption?: string;
  sortOrder: number;
}

export interface ArticleDetail {
  id: number;
  categoryId: number;
  categorySlug: string;
  authorName?: string;
  coverImage?: string;
  status: 'draft' | 'published' | 'archived';
  pdfEnabled: boolean;
  pdfFilePath?: string;
  publishedAt?: string;
  title: string;
  slug: string;
  summary?: string;
  body: string;
  langCode: string;
  media: ContentMedia[];
  isFallback: boolean;
  availableLanguages: string[];
}
