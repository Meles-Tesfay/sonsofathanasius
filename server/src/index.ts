import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { config } from './config/index.js';
import { securityHeaders, corsMiddleware, methodAllowlist } from './middleware/security.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

const app = express();

// 1. Security & Method Allowlist Middleware
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(methodAllowlist);

// 2. Cookie & Body Parsing Middleware
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Static Uploads File Serving (Local dev parity with production Apache web root)
app.use('/uploads', express.static(config.storage.uploadsDir));

// 4. Global Rate Limiter for API
app.use('/api/', generalLimiter);

// 5. API Documentation Alias & API v1 Master Router
app.get('/api/docs', (_req: Request, res: Response) => res.redirect('/api/v1/docs'));
app.use('/api/v1', apiRouter);

// 6. Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'ደቂቀ አትናቴዎስ (Sons of Athanasius) API',
    version: '2.0.0',
    documentation: '/api/v1/docs',
    openApiSpec: '/api/v1/docs.json',
    health: '/api/v1/health',
  });
});

// 7. Global 404 Handler
app.use(notFoundHandler);

// 8. Centralized Error Handler (Express 5 native async support)
app.use(errorHandler);

import { initializeSearchIndex } from './services/searchService.js';
import { reconcileMissingPdfs } from './services/pdfService.js';

// 9. Server Boot
let server: import('http').Server | undefined;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, async () => {
    console.log(`☦ [Sons of Athanasius API] Server running on http://localhost:${config.port} (${config.nodeEnv})`);

    // Ensure upload directories exist on disk
    if (!fs.existsSync(config.storage.coversDir)) {
      fs.mkdirSync(config.storage.coversDir, { recursive: true });
    }
    if (!fs.existsSync(config.storage.pdfDir)) {
      fs.mkdirSync(config.storage.pdfDir, { recursive: true });
    }

    // Warm up in-memory full-text search index
    await initializeSearchIndex();

    // Reconcile and backfill any missing PDFs for published articles
    await reconcileMissingPdfs();
  });
}

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server?.close(() => {
    console.log('Process terminated.');
  });
});

export default app;
