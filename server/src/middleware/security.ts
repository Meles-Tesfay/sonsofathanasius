import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { sendError } from '../utils/response.js';

// 1. Helmet Security Headers Configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      mediaSrc: ["'self'", 'https:', 'blob:'],
      frameSrc: ["'self'", 'https://www.youtube.com', 'https://youtube.com', 'https://player.vimeo.com', 'https://w.soundcloud.com'],
      connectSrc: ["'self'", config.clientUrl, 'https://www.sonsofathanasius.com', 'https://sonsofathanasius.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'sameorigin' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// 2. Allowed CORS Origins
const allowedOrigins = [
  config.clientUrl,
  'https://www.sonsofathanasius.com',
  'https://sonsofathanasius.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser tools (e.g. curl, server-to-server) or matching allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} is not allowed by CORS policy.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Cache'],
  exposedHeaders: ['X-Cache', 'Content-Disposition'],
  credentials: true,
  maxAge: 86400, // 24 hours
});

// 3. HTTP Methods Allowlist Middleware
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']);

export function methodAllowlist(req: Request, res: Response, next: NextFunction) {
  if (!ALLOWED_METHODS.has(req.method)) {
    return sendError(res, `HTTP method ${req.method} is not supported.`, 405);
  }
  next();
}
