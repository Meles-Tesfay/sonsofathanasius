import { Router } from 'express';
import { validateQuery } from '../validators/queryValidator.js';
import {
  ArticleFeedQuerySchema,
  LatestArticlesQuerySchema,
  ArticleDetailQuerySchema,
} from '../validators/publicQueryValidator.js';
import { cachedRoute } from '../middleware/cacheMiddleware.js';
import { CACHE_TTL } from '../cache/index.js';
import {
  getArticleFeed,
  getLatestArticles,
  getArticleBySlug,
} from '../controllers/articleController.js';
import { pdfLimiter } from '../middleware/rateLimiter.js';
import { downloadArticlePdfController } from '../controllers/pdfController.js';

const router = Router();

/**
 * Latest Articles Endpoint (MUST be registered before /:slug)
 * GET /api/v1/articles/latest?lang={am|en|om|ti}
 * Cache: 5 min fresh, 1 min stale window
 */
router.get(
  '/latest',
  validateQuery(LatestArticlesQuerySchema),
  cachedRoute('art', CACHE_TTL.ARTICLES_LATEST, CACHE_TTL.ARTICLES_FEED_STALE)(getLatestArticles)
);

/**
 * Paginated Article Feed Endpoint
 * GET /api/v1/articles?category={slug}&tag={slug}&page=1&limit=12&lang=am&sort=latest
 * Cache: 5 min fresh, 1 min stale window
 */
router.get(
  '/',
  validateQuery(ArticleFeedQuerySchema),
  cachedRoute('art', CACHE_TTL.ARTICLES_FEED, CACHE_TTL.ARTICLES_FEED_STALE)(getArticleFeed)
);

/**
 * Article PDF Download Route (MUST be before /:slug to avoid param collision)
 * GET /api/v1/articles/:slug/pdf?lang={am|en|om|ti}
 */
router.get('/:slug/pdf', pdfLimiter, downloadArticlePdfController);

/**
 * Single Article Detail with Smart Multilingual Fallback
 * GET /api/v1/articles/:slug?lang={am|en|om|ti}
 * Cache: 10 min fresh, 2 min stale window
 */
router.get(
  '/:slug',
  validateQuery(ArticleDetailQuerySchema),
  cachedRoute('art', CACHE_TTL.ARTICLE_DETAIL, CACHE_TTL.ARTICLE_DETAIL_STALE)(getArticleBySlug)
);

export default router;
