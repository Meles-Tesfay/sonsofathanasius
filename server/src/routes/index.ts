import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import { config } from '../config/index.js';
import { getCacheMetrics } from '../cache/metrics.js';
import docsRouter from './docs.js';
import searchRouter from './search.js';
import uploadRouter from './upload.js';
import articlesRouter from './articles.js';
import categoriesRouter from './categories.js';
import tagsRouter from './tags.js';
import dailyRouter from './daily.js';

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

// 7. Admin Media Upload Route
router.use('/admin', uploadRouter);

/**
 * Health Check & API Status Endpoint
 * GET /api/v1/health
 */
router.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    app: 'Sons of Athanasius API',
    version: '2.0.0',
    status: 'healthy',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    documentation: '/api/v1/docs',
    cache: getCacheMetrics(),
  });
});

/**
 * Cache & Performance Metrics Endpoint
 * GET /api/v1/metrics
 */
router.get('/metrics', (_req: Request, res: Response) => {
  sendSuccess(res, {
    cache: getCacheMetrics(),
    memoryUsage: process.memoryUsage(),
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
