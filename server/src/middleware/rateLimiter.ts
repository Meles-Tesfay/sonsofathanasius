import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError } from '../utils/response.js';

// 1. General Read APIs Limiter (300 requests / 15 mins)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Too many requests from this IP. Please try again after 15 minutes.', 429);
  },
});

// 2. Search API Limiter (60 requests / 1 min)
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Search rate limit exceeded. Please wait a minute before making more queries.', 429);
  },
});

// 3. Contact Form Submission Limiter (1 requests / 15 mins)
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Contact submission limit reached. Please wait 15 minutes before sending another message.', 429);
  },
});

// 4. PDF Generation Limiter (10 downloads / 5 mins)
export const pdfLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'PDF generation rate limit exceeded. Please wait 5 minutes before downloading more documents.', 429);
  },
});

// 5. Admin API Limiter (100 requests / 15 mins)
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Too many admin requests from this IP. Please try again later.', 429);
  },
});
