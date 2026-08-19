import { Router } from 'express';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { verifyAdminSession } from '../middleware/auth.js';
import { login, logout, me, logoutAll } from '../controllers/authController.js';

const router = Router();

/**
 * Admin Auth Routes — /api/v1/admin/auth
 *
 * POST /login      Public (rate-limited)
 * POST /logout     Authenticated
 * GET  /me         Authenticated
 * POST /logout-all Authenticated
 */
router.post('/login', adminLimiter, login);
router.post('/logout', verifyAdminSession, logout);
router.get('/me', verifyAdminSession, me);
router.post('/logout-all', verifyAdminSession, logoutAll);

export default router;
