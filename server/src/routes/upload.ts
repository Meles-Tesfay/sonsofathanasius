import { Router } from 'express';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { verifyAdminSession } from '../middleware/auth.js';
import { uploadCoverController } from '../controllers/uploadController.js';

const router = Router();

/**
 * Admin Cover Image Upload Endpoint
 * POST /api/v1/admin/covers/upload
 * Protected: adminLimiter → verifyAdminSession → multer → magic bytes
 */
router.post('/covers/upload', adminLimiter, verifyAdminSession, uploadCoverController);

export default router;

