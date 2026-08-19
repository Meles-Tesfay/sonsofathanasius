import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import { config } from '../config/index.js';
import { getCacheMetrics } from '../cache/metrics.js';
import docsRouter from './docs.js';
import searchRouter from './search.js';
import uploadRouter from './upload.js';
import categoriesRouter from './categories.js';
import tagsRouter from './tags.js';
import articlesRouter from './articles.js';
import dailyRouter from './daily.js';

const router = Router();

// 1. Interactive OpenAPI Swagger Documentation
router.use('/', docsRouter);

// 2. Full-Text Search Engine Route
router.use('/search', searchRouter);

// 3. Admin Storage & Uploads Route
router.use('/admin', uploadRouter);

// 4. Public REST API Routes (Phase B6)
router.use('/categories', categoriesRouter);
router.use('/tags', tagsRouter);
router.use('/articles', articlesRouter);  // Includes /articles/:slug/pdf
router.use('/daily', dailyRouter);

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
