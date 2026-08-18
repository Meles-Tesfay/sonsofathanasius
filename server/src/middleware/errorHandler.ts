import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response.js';
import { config } from '../config/index.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('❌ [API Error Handler]:', err);

  // 1. Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const errorDetails = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return sendError(res, `Validation failed: ${errorDetails}`, 400, {
      issues: err.errors,
    });
  }

  // 2. Handle standard Error instances
  if (err instanceof Error) {
    // CORS errors
    if (err.message.includes('CORS')) {
      return sendError(res, err.message, 403);
    }

    // Database Duplicate Key Errors (MySQL code: ER_DUP_ENTRY / 1062)
    if ('errno' in err && (err as { errno: number }).errno === 1062) {
      return sendError(res, 'A record with this identifier or slug already exists.', 409);
    }

    // Generic error message
    const message = config.nodeEnv === 'production' ? 'Internal server error' : err.message;
    return sendError(res, message, 500);
  }

  // 3. Fallback for non-standard error types
  return sendError(res, 'An unexpected server error occurred.', 500);
}

// 4. 404 Route Not Found Handler
export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, `API route not found: ${req.method} ${req.originalUrl}`, 404);
}
