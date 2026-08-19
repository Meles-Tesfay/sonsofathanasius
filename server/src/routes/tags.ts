import { Router } from 'express';
import { getTags } from '../controllers/tagController.js';
import { cachedRoute } from '../middleware/cacheMiddleware.js';
import { CACHE_TTL } from '../cache/index.js';
import { tagsLimiter } from '../middleware/rateLimiter.js';
import { validateQuery } from '../validators/queryValidator.js';
import { TagQuerySchema } from '../validators/publicQueryValidator.js';

const router = Router();

/**
 * @openapi
 * /api/v1/tags:
 *   get:
 *     summary: List tags
 *     description: Retrieve all article tags with published article counts, sorted by popular usage.
 *     tags:
 *       - Taxonomy
 *     responses:
 *       200:
 *         description: List of tags with article usage counts
 *         headers:
 *           X-Cache:
 *             schema:
 *               type: string
 *               enum: [HIT, MISS, COALESCED, STALE]
 */
router.get(
  '/',
  validateQuery(TagQuerySchema),
  tagsLimiter,
  cachedRoute('tags', CACHE_TTL.TAGS, CACHE_TTL.CATEGORIES_STALE)(getTags)
);

export default router;
