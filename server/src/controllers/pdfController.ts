import { Request, Response } from 'express';
import fs from 'fs';
import { getOrGenerateArticlePdf } from '../services/pdfService.js';
import { sendError } from '../utils/response.js';

/**
 * Stream or generate static article PDF
 * GET /api/v1/articles/:slug/pdf?lang={am|en|om|ti}
 */
export async function downloadArticlePdfController(req: Request, res: Response) {
  const rawSlug = req.params.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const rawLang = req.query.lang;
  const lang = (Array.isArray(rawLang) ? rawLang[0] : rawLang) || 'am';

  if (!slug || typeof slug !== 'string') {
    return sendError(res, 'Article slug is required', 400);
  }

  try {
    const { filePath, fileName } = await getOrGenerateArticlePdf(slug, String(lang));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800'); // 1-day fresh, 7-day stale revalidate

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('PDF stream error:', err);
      if (!res.headersSent) {
        sendError(res, 'Error streaming PDF file', 500);
      }
    });

    return stream.pipe(res);
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode || 500;
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    return sendError(res, message, statusCode);
  }
}
