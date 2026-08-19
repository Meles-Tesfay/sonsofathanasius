import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export interface ValidatedRequest<TQuery = any, TParams = any> extends Request {
  validatedQuery?: TQuery;
  validatedParams?: TParams;
}

/**
 * Reusable Query Validator Middleware 
 * Rejects malformed/hostile query parameters with 400 Bad Request
 * BEFORE hitting the cache layer or database by forwarding ZodError to errorHandler.
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: ValidatedRequest<z.infer<T>, any>, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next(result.error);
    }

    req.validatedQuery = result.data;
    next();
  };
}

/**
 * Reusable Path Parameters Validator Middleware
 * Rejects invalid route parameters with 400 Bad Request
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: ValidatedRequest<any, z.infer<T>>, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return next(result.error);
    }

    req.validatedParams = result.data;
    next();
  };
}
