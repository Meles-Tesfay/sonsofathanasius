import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError } from '../utils/response.js';

// 1. Coarse Global Safety Net (1000 requests / 15 mins)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Global rate limit exceeded. Please try again after 15 minutes.', 429);
  },
});

// 2. Dedicated Articles Limiter (300 requests / 15 mins)
export const articlesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Articles rate limit reached. Please wait before requesting more articles.', 429);
  },
});

// 3. Dedicated Categories Limiter (300 requests / 15 mins)
export const categoriesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Categories rate limit reached. Please wait before making more requests.', 429);
  },
});

// 4. Dedicated Tags Limiter (300 requests / 15 mins)
export const tagsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Tags rate limit reached. Please wait before making more requests.', 429);
  },
});

// 5. Dedicated Daily Lectionary Limiter (300 requests / 15 mins)
export const dailyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Daily reading rate limit reached. Please try again later.', 429);
  },
});

// 6. Search API Limiter (60 requests / 1 min)
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Search rate limit exceeded. Please wait a minute before making more queries.', 429);
  },
});

// 7. Contact Form Submission Limiter (1 request / 15 mins)
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Contact submission limit reached. Please wait 15 minutes before sending another message.', 429);
  },
});

// 8. PDF Generation Limiter (5 downloads / 5 mins)
export const pdfLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'PDF generation rate limit exceeded. Please wait 5 minutes before downloading more documents.', 429);
  },
});

// 9. Admin API Limiter (100 requests / 15 mins)
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendError(res, 'Too many admin requests from this IP. Please try again later.', 429);
  },
});
