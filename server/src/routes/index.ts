import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import { config } from '../config/index.js';
import { getCacheMetrics } from '../cache/metrics.js';
import docsRouter from './docs.js';
import searchRouter from './search.js';
import adminRouter from './admin.js';
import articlesRouter from './articles.js';
import categoriesRouter from './categories.js';
import tagsRouter from './tags.js';
import dailyRouter from './daily.js';
import authRouter from './auth.js';
import contactRouter from './contact.js';

const router = Router();

// 1. Interactive OpenAPI Swagger Documentation
router.use('/', docsRouter);

// 2. Categories Taxonomy Route
router.use('/categories', categoriesRouter);

// 3. Tags Taxonomy Route
router.use('/tags', tagsRouter);

// 4. Articles & PDF Delivery Route
router.use('/articles', articlesRouter);

// 5. Daily Lectionary & Patristic Reading Route
router.use('/daily', dailyRouter);

// 6. In-Memory Search Engine Route
router.use('/search', searchRouter);

// 7. Admin Session Authentication Route
router.use('/admin/auth', authRouter);

// 8. Admin Content Management & Media Upload Routes
router.use('/admin', adminRouter);

// 9. Contact Form Submission Route (B8)
router.use('/contact', contactRouter);

// 8. Contact Form Route
router.use('/contact', contactRouter);

/**
 * Health Check & API Status Endpoint
 * GET /api/v1/health
 */
router.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    app: 'Sons of Athanasius API',
    version: '2.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    ...(config.isProduction
      ? {}
      : {
          environment: config.nodeEnv,
          documentation: config.enableSwagger ? '/api/v1/docs' : undefined,
          cache: getCacheMetrics(),
        }),
  });
});

/**
 * Cache & Performance Metrics Endpoint (Non-production or explicit opt-in only)
 * GET /api/v1/metrics
 */
if (config.enableMetrics) {
  router.get('/metrics', (_req: Request, res: Response) => {
    sendSuccess(res, {
      cache: getCacheMetrics(),
      memoryUsage: process.memoryUsage(),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });
}

export default router;
