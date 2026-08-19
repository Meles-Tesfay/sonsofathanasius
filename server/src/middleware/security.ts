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
      connectSrc: [
        "'self'",
        config.clientUrl,
        'https://sonsofathanasius.com',
        'https://www.sonsofathanasius.com',
        'https://api.sonsofathanasius.com',
        'https://admin.sonsofathanasius.com',
      ],
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

// 2. Explicit Whitelist for Production Origins (Blocks Subdomain Takeover Vectors)
const ALLOWED_PRODUCTION_ORIGINS = new Set([
  'https://sonsofathanasius.com',
  'https://www.sonsofathanasius.com',
  'https://api.sonsofathanasius.com',
  'https://admin.sonsofathanasius.com',
]);

// Local development origin pattern (exact localhost or loopback IP only — no wildcard subdomains)
const LOCAL_DEV_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true; // Allow non-browser requests (e.g. cURL, cron tasks, server-to-server)

  // 1. In production: strictly permit only explicit production origins
  if (config.isProduction) {
    return ALLOWED_PRODUCTION_ORIGINS.has(origin);
  }

  // 2. In non-production: check production origins, explicit clientUrl, and local development host patterns
  if (ALLOWED_PRODUCTION_ORIGINS.has(origin)) return true;
  if (config.clientUrl && origin === config.clientUrl) return true;
  if (LOCAL_DEV_REGEX.test(origin)) return true;

  return false;
};

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} is not permitted by CORS policy.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Cache'],
  exposedHeaders: ['X-Cache', 'Content-Disposition'],
  credentials: true, // Required for secure cookie transmission
  maxAge: 86400, // 24 hours
});

// 3. HTTP Methods Allowlist Middleware
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']);

export function methodAllowlist(req: Request, res: Response, next: NextFunction) {
  if (!ALLOWED_METHODS.has(req.method)) {
    return sendError(res, `HTTP method ${req.method} is not supported.`, 405);
  }
  next();
}
