import { Router } from 'express';
import { searchLimiter } from '../middleware/rateLimiter.js';
import { validateQuery } from '../validators/queryValidator.js';
import { SearchQuerySchema } from '../validators/searchValidator.js';
import { searchController } from '../controllers/searchController.js';

const router = Router();

/**
 * Public Full-Text Search Endpoint
 * GET /api/v1/search
 */
router.get('/', searchLimiter, validateQuery(SearchQuerySchema), searchController);

export default router;
