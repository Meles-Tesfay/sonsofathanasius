import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import { config } from '../config/index.js';
import { getCacheMetrics } from '../cache/metrics.js';
import docsRouter from './docs.js';

import searchRouter from './search.js';

const router = Router();

// 1. Interactive OpenAPI Swagger Documentation
router.use('/', docsRouter);

// 2. Full-Text Search Engine Route
router.use('/search', searchRouter);

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
