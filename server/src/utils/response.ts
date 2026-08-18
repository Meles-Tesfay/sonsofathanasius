import { Response } from 'express';
import { ApiResponse, ResponseMeta } from '../types/index.js';

/**
 * Send a standardized successful JSON response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: Omit<ResponseMeta, 'timestamp'>,
  statusCode: number = 200
): Response<ApiResponse<T>> {
  const fullMeta: ResponseMeta = {
    timestamp: new Date().toISOString(),
    ...meta,
  };

  return res.status(statusCode).json({
    success: true,
    data,
    meta: fullMeta,
  });
}

/**
 * Send a standardized paginated JSON response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number },
  extraMeta?: Record<string, unknown>,
  statusCode: number = 200
): Response<ApiResponse<T[]>> {
  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;

  const fullMeta: ResponseMeta = {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages,
    timestamp: new Date().toISOString(),
    ...extraMeta,
  };

  return res.status(statusCode).json({
    success: true,
    data,
    meta: fullMeta,
  });
}

/**
 * Send a standardized error JSON response
 */
export function sendError(
  res: Response,
  error: string,
  statusCode: number = 500,
  meta?: Omit<ResponseMeta, 'timestamp'>
): Response<ApiResponse<null>> {
  const fullMeta: ResponseMeta = {
    timestamp: new Date().toISOString(),
    ...meta,
  };

  return res.status(statusCode).json({
    success: false,
    error,
    meta: fullMeta,
  });
}
