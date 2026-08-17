import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendError } from '../utils/response.js';

export interface ValidatedRequest<T = unknown> extends Request {
  validatedQuery?: T;
}

/**
 * Reusable Query Validator Middleware 
 * Rejects malformed/hostile query parameters with 400 Bad Request
 * BEFORE hitting the cache layer or database.
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: ValidatedRequest<z.infer<T>>, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const details = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return sendError(res, `Invalid query parameters: ${details}`, 400, {
        issues: result.error.errors,
      });
    }

    req.validatedQuery = result.data;
    next();
  };
}
