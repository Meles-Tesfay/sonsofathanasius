import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';

const app = express();

// 1. Security & Headers Middleware
app.use(helmet());
app.use(
  cors({
    origin: [config.clientUrl, 'https://www.sonsofathanasius.com', 'https://sonsofathanasius.com'],
    credentials: true,
  })
);

// 2. Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Rate Limiting Middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api/', apiLimiter);

// 4. Base Health & Version Route
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Sons of Athanasius API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// 5. Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'ደቂቀ አትናቴዎስ (Sons of Athanasius) API',
    version: '2.0.0',
    documentation: '/api/v1/health',
  });
});

// 6. Global 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// 7. Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// 8. Server Boot
const server = app.listen(config.port, () => {
  console.log(`☦ [Sons of Athanasius API] Server running on http://localhost:${config.port} (${config.nodeEnv})`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
  });
});

export default app;
