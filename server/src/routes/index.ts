import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import { config } from '../config/index.js';
import docsRouter from './docs.js';

const router = Router();

// 1. Interactive OpenAPI Swagger Documentation
router.use('/', docsRouter);

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
  });
});

export default router;
