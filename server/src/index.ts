import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
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

// 3. Global Rate Limiter for API
app.use('/api/', generalLimiter);

// 4. API Documentation Alias & API v1 Master Router
app.get('/api/docs', (_req: Request, res: Response) => res.redirect('/api/v1/docs'));
app.use('/api/v1', apiRouter);

// 5. Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'ደቂቀ አትናቴዎስ (Sons of Athanasius) API',
    version: '2.0.0',
    documentation: '/api/v1/docs',
    openApiSpec: '/api/v1/docs.json',
    health: '/api/v1/health',
  });
});

// 6. Global 404 Handler
app.use(notFoundHandler);

// 7. Centralized Error Handler (Express 5 native async support)
app.use(errorHandler);

import { initializeSearchIndex } from './services/searchService.js';

// 8. Server Boot
const server = app.listen(config.port, async () => {
  console.log(`☦ [Sons of Athanasius API] Server running on http://localhost:${config.port} (${config.nodeEnv})`);
  // Warm up in-memory full-text search index
  await initializeSearchIndex();
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
  });
});

export default app;
