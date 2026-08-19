import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { getOrGenerateArticlePdf } from '../services/pdfService.js';
import { BadRequestError } from '../middleware/errorHandler.js';
import { ValidatedRequest } from '../validators/queryValidator.js';
import { PdfQueryParams, ArticleSlugParams } from '../validators/publicQueryValidator.js';

/**
 * Stream or generate static article PDF
 * GET /api/v1/articles/:slug/pdf?lang={am|en|om|ti}
 */
export async function downloadArticlePdfController(req: Request, res: Response, next: NextFunction) {
  const params = (req as ValidatedRequest<any, ArticleSlugParams>).validatedParams || req.params;
  const query = (req as ValidatedRequest<PdfQueryParams>).validatedQuery || { lang: 'am' };

  const slug = String(params.slug || req.params.slug || '').trim();
  const lang = query.lang || 'am';

  if (!slug) {
    throw new BadRequestError('Article slug is required');
  }

  try {
    const { filePath, fileName } = await getOrGenerateArticlePdf(slug, lang);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800'); // 1-day fresh, 7-day stale revalidate

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('PDF stream error:', err);
      if (!res.headersSent) {
        next(err);
      }
    });

    return stream.pipe(res);
  } catch (err) {
    next(err);
  }
}
