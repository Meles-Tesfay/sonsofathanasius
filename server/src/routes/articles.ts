import { Router } from 'express';
import {
  getArticles,
  getLatestArticles,
  getArticleBySlug,
} from '../controllers/articleController.js';
import { downloadArticlePdfController } from '../controllers/pdfController.js';
import { cachedRoute } from '../middleware/cacheMiddleware.js';
import { CACHE_TTL } from '../cache/index.js';
import { articlesLimiter, pdfLimiter } from '../middleware/rateLimiter.js';
import { trackViewMiddleware } from '../cache/viewCounter.js';
import { validateQuery, validateParams } from '../validators/queryValidator.js';
import {
  ArticleFeedQuerySchema,
  LatestArticlesQuerySchema,
  ArticleDetailQuerySchema,
  ArticleSlugParamSchema,
  PdfQuerySchema,
} from '../validators/publicQueryValidator.js';

const router = Router();

/**
 * @openapi
 * /api/v1/articles:
 *   get:
 *     summary: List articles
 *     description: Retrieve paginated published articles with optional category/tag filtering and sorting.
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: am
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category slug filter
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Tag slug filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [latest, popular]
 *           default: latest
 *     responses:
 *       200:
 *         description: Paginated article list
 */
router.get(
  '/',
  validateQuery(ArticleFeedQuerySchema),
  articlesLimiter,
  cachedRoute('articles:feed', CACHE_TTL.ARTICLES_FEED, CACHE_TTL.ARTICLES_FEED_STALE)(getArticles)
);

/**
 * @openapi
 * /api/v1/articles/latest:
 *   get:
 *     summary: Latest articles feed
 *     description: Retrieve latest articles across all categories for homepage hero/grid.
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: am
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *     responses:
 *       200:
 *         description: Latest articles feed
 */
router.get(
  '/latest',
  validateQuery(LatestArticlesQuerySchema),
  articlesLimiter,
  cachedRoute('articles:latest', CACHE_TTL.ARTICLES_LATEST, CACHE_TTL.ARTICLES_FEED_STALE)(getLatestArticles)
);

/**
 * @openapi
 * /api/v1/articles/{slug}/pdf:
 *   get:
 *     summary: Download article PDF
 *     description: Stream pre-generated or on-demand compiled article PDF in requested language.
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: am
 *     responses:
 *       200:
 *         description: PDF file stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get(
  '/:slug/pdf',
  validateParams(ArticleSlugParamSchema),
  validateQuery(PdfQuerySchema),
  pdfLimiter,
  downloadArticlePdfController
);

/**
 * @openapi
 * /api/v1/articles/{slug}:
 *   get:
 *     summary: Get article detail
 *     description: Retrieve full article content by slug or ID with smart multilingual fallback and media.
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: am
 *     responses:
 *       200:
 *         description: Complete article detail
 *       404:
 *         description: Article not found
 */
router.get(
  '/:slug',
  validateParams(ArticleSlugParamSchema),
  validateQuery(ArticleDetailQuerySchema),
  articlesLimiter,
  trackViewMiddleware,
  cachedRoute('articles:detail', CACHE_TTL.ARTICLE_DETAIL, CACHE_TTL.ARTICLE_DETAIL_STALE)(getArticleBySlug)
);

export default router;
