import { Response } from 'express';
import { ValidatedRequest } from '../validators/queryValidator.js';
import { SearchQueryParams } from '../validators/searchValidator.js';
import { searchArticles } from '../services/searchService.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Handle Search Query
 * GET /api/v1/search?q={query}&lang={am|en|om|ti}&category={slug}&limit=20
 */
export async function searchController(req: ValidatedRequest<SearchQueryParams>, res: Response) {
  const { q, lang, limit, category } = req.validatedQuery!;

  const results = searchArticles(q, lang, limit, category);

  return sendSuccess(
    res,
    results,
    {
      total: results.length,
      query: q,
      lang,
      limit,
      category: category || null,
    }
  );
}
