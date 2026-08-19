import { Router } from 'express';
import { getDailyReading } from '../controllers/dailyController.js';
import { cachedRoute } from '../middleware/cacheMiddleware.js';
import { CACHE_TTL } from '../cache/index.js';
import { dailyLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * @openapi
 * /api/v1/daily:
 *   get:
 *     summary: Daily Orthodox lectionary & patristic reading
 *     description: Retrieve daily saint commemoration, scripture verse, and patristic quote with automatic calendar date rollover.
 *     tags:
 *       - Spiritual
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: am
 *     responses:
 *       200:
 *         description: Daily reading content
 *         headers:
 *           X-Cache:
 *             schema:
 *               type: string
 *               enum: [HIT, MISS, COALESCED, STALE]
 */
router.get(
  '/',
  dailyLimiter,
  cachedRoute(
    (_req) => `daily:${new Date().toISOString().split('T')[0]}`,
    CACHE_TTL.DAILY,
    CACHE_TTL.DAILY_STALE
  )(getDailyReading)
);

export default router;
