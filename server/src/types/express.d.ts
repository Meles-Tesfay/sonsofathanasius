/**
 * Express Request Augmentation for Admin Session Auth (Phase B7)
 * Adds req.admin property to all authenticated admin routes.
 */
declare namespace Express {
  interface Request {
    admin?: {
      id: number;
      username: string;
      email: string;
      role: 'superadmin' | 'editor' | 'translator';
    };
  }
}
