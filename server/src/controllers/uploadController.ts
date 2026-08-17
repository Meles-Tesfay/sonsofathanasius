import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { uploadCover } from '../middleware/uploadMiddleware.js';
import { verifyImageMagicBytes } from '../utils/magicBytes.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Handle Cover Image Upload
 * POST /api/v1/admin/covers/upload
 */
export function uploadCoverController(req: Request, res: Response, _next: NextFunction) {
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
    if (!magicCheck.isValid || !magicCheck.format) {
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

    let finalFilename = req.file.filename;
    let finalPath = req.file.path;
    const verifiedExt = magicCheck.format === 'webp' ? '.webp' : '.jpg';

    // If client MIME extension mismatches verified binary format, rename to correct extension
    if (!finalFilename.toLowerCase().endsWith(verifiedExt)) {
      const parsed = path.parse(finalFilename);
      const newFilename = `${parsed.name}${verifiedExt}`;
      const newPath = path.join(path.dirname(finalPath), newFilename);

      try {
        await fs.promises.rename(finalPath, newPath);
        finalFilename = newFilename;
        finalPath = newPath;
      } catch (renameErr) {
        console.error('Failed to align image file extension:', renameErr);
      }
    }

    const coverUrl = `/uploads/covers/${finalFilename}`;

    return sendSuccess(res, {
      coverUrl,
      filename: finalFilename,
      sizeBytes: req.file.size,
      format: magicCheck.format,
    });
  });
}
