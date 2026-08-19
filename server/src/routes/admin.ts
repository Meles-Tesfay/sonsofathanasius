import { Router } from 'express';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { verifyAdminSession } from '../middleware/auth.js';
import {
  createArticle,
  updateArticle,
  deleteArticle,
  upsertTranslation,
} from '../controllers/adminController.js';

const router = Router();

/**
 * Admin Content Management Routes — /api/v1/admin
 *
 * All routes require rate limiting + session authentication.
 *
 * POST   /articles                 Create article (atomic transaction)
 * PUT    /articles/:id             Update article metadata & translations
 * DELETE /articles/:id             Cascade delete article + PDF cleanup
 * POST   /articles/:id/translations  UPSERT a single translation
 */
router.use(adminLimiter);
router.use(verifyAdminSession);

router.post('/articles', createArticle);
router.put('/articles/:id', updateArticle);
router.delete('/articles/:id', deleteArticle);
router.post('/articles/:id/translations', upsertTranslation);

export default router;
