import { Router } from 'express';
import { validateQuery } from '../validators/queryValidator.js';
import { CategoryQuerySchema } from '../validators/publicQueryValidator.js';
import { cachedRoute } from '../middleware/cacheMiddleware.js';
import { CACHE_TTL } from '../cache/index.js';
import { listCategories } from '../controllers/categoryController.js';

const router = Router();

/**
 * Public Category Taxonomy Endpoint
 * GET /api/v1/categories?lang={am|en|om|ti}
 * Cache: 1 hour fresh, 5 min stale window
 */
router.get(
  '/',
  validateQuery(CategoryQuerySchema),
  cachedRoute('cat', CACHE_TTL.CATEGORIES, CACHE_TTL.CATEGORIES_STALE)(listCategories)
);

export default router;
