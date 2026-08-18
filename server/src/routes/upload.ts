import { Router } from 'express';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { uploadCoverController } from '../controllers/uploadController.js';

const router = Router();

/**
 * Admin Cover Image Upload Endpoint
 * POST /api/v1/admin/covers/upload
 */
router.post('/covers/upload', adminLimiter, uploadCoverController);

export default router;
