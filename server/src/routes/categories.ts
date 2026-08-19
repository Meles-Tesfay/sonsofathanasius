import { Router } from 'express';
import { getCategories } from '../controllers/categoryController.js';
import { cachedRoute } from '../middleware/cacheMiddleware.js';
import { CACHE_TTL } from '../cache/index.js';
import { categoriesLimiter } from '../middleware/rateLimiter.js';
import { validateQuery } from '../validators/queryValidator.js';
import { CategoryQuerySchema } from '../validators/publicQueryValidator.js';

const router = Router();

/**
 * @openapi
 * /api/v1/categories:
 *   get:
 *     summary: List active categories
 *     description: Retrieve all active article categories with localized names, descriptions, and published article counts.
 *     tags:
 *       - Taxonomy
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [am, en, om, ti]
 *           default: am
 *         description: Language code for localized category names and descriptions
 *     responses:
 *       200:
 *         description: List of localized categories
 *         headers:
 *           X-Cache:
 *             schema:
 *               type: string
 *               enum: [HIT, MISS, COALESCED, STALE]
 */
router.get(
  '/',
  validateQuery(CategoryQuerySchema),
  categoriesLimiter,
  cachedRoute('categories', CACHE_TTL.CATEGORIES, CACHE_TTL.CATEGORIES_STALE)(getCategories)
);

export default router;
