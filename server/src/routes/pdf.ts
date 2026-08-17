import { Router } from 'express';
import { pdfLimiter } from '../middleware/rateLimiter.js';
import { downloadArticlePdfController } from '../controllers/pdfController.js';

const router = Router();

/**
 * Article PDF Download Route
 * GET /api/v1/articles/:slug/pdf
 */
router.get('/:slug/pdf', pdfLimiter, downloadArticlePdfController);

export default router;
