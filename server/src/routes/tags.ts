import { Router } from 'express';
import { validateQuery } from '../validators/queryValidator.js';
import { TagQuerySchema } from '../validators/publicQueryValidator.js';
import { cachedRoute } from '../middleware/cacheMiddleware.js';
import { CACHE_TTL } from '../cache/index.js';
import { listTags } from '../controllers/tagController.js';

const router = Router();

/**
 * Public Tag Listing Endpoint
 * GET /api/v1/tags?lang={am|en|om|ti}
 * Cache: 1 hour fresh, 5 min stale window
 */
router.get(
  '/',
  validateQuery(TagQuerySchema),
  cachedRoute('tag', CACHE_TTL.TAGS, CACHE_TTL.CATEGORIES_STALE)(listTags)
);

export default router;
