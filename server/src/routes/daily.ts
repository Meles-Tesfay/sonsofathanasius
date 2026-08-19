import { Router } from 'express';
import { validateQuery } from '../validators/queryValidator.js';
import { DailyQuerySchema } from '../validators/publicQueryValidator.js';
import { cachedRoute } from '../middleware/cacheMiddleware.js';
import { CACHE_TTL } from '../cache/index.js';
import { getDailyLectionary } from '../controllers/dailyController.js';

const router = Router();

/**
 * Daily Lectionary & Saints Endpoint
 * GET /api/v1/daily?lang={am|en|om|ti}
 * Cache: 24 hours fresh, 1 hour stale window
 */
router.get(
  '/',
  validateQuery(DailyQuerySchema),
  cachedRoute('daily', CACHE_TTL.DAILY, CACHE_TTL.DAILY_STALE)(getDailyLectionary)
);

export default router;
