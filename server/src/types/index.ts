export type SupportedLanguage = 'am' | 'en' | 'om' | 'ti';

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
}

export interface ArticleQueryFilter {
  lang?: SupportedLanguage;
  category?: string;
  tag?: string;
  page?: number;
  limit?: number;
}
