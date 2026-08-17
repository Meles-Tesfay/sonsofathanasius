import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { uploadCover } from '../middleware/uploadMiddleware.js';
import { verifyImageMagicBytes } from '../utils/magicBytes.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Handle Cover Image Upload
 * POST /api/v1/admin/covers/upload
 */
export function uploadCoverController(req: Request, res: Response, next: NextFunction) {
  uploadCover(req, res, async (err: unknown) => {
    if (err) {
      const errorMessage = err instanceof Error ? err.message : 'File upload failed';
      return sendError(res, errorMessage, 400);
    }

    if (!req.file) {
      return sendError(res, 'No cover image file provided. Field name must be "cover".', 400);
    }

    // Server-Side Magic Byte Verification
    const magicCheck = await verifyImageMagicBytes(req.file.path);
    if (!magicCheck.isValid) {
      // Remove invalid/disguised file immediately
      try {
        await fs.promises.unlink(req.file.path);
      } catch {
        // Ignore unlink error
      }
      return sendError(
        res,
        'File rejected: Content signature does not match valid WebP or JPEG format.',
        400
      );
    }

    const coverUrl = `/uploads/covers/${req.file.filename}`;

    return sendSuccess(res, {
      coverUrl,
      filename: req.file.filename,
      sizeBytes: req.file.size,
      format: magicCheck.format,
    });
  });
}
