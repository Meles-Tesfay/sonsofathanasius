import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { admins, adminSessions } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';
import { sendSuccess } from '../utils/response.js';
import { UnauthorizedError, BadRequestError } from '../middleware/errorHandler.js';
import { verifyPassword, generateSessionToken } from '../utils/crypto.js';
import {
  ADMIN_COOKIE_NAME,
  getAdminCookieOptions,
  cacheSession,
  evictSessionCache,
  evictAdminSessionsCache,
  AuthenticatedAdmin,
} from '../middleware/auth.js';

export const LoginSchema = z.object({
  identifier: z.string().min(3, 'Username or email is required').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// Pre-computed static dummy scrypt hash to equalize response times and prevent user enumeration
const DUMMY_SCRYPT_HASH =
  'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:7b682e05b9588b56f8f553a1a1f0a1c6a2879a95267b14d284a123689403a55255470d046f483c66f564dc17578278772a083d060f640989ad911636c7473fa5';

/**
 * POST /api/v1/admin/auth/login
 * Authenticates admin credentials, persists session in MariaDB, and sets host-only cookie.
 */
export async function loginController(req: Request, res: Response): Promise<void> {
  const parseResult = LoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
    throw new BadRequestError(errorMsg || 'Invalid credentials payload');
  }

  const { identifier, password } = parseResult.data;

  // Extract client metadata for audit logging (req.ip is trustworthy: trust proxy = 'loopback')
  const ipAddress = req.ip || req.socket.remoteAddress || null;
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;

  // 1. Query admin record by username OR email
  const adminRows = await db
    .select()
    .from(admins)
    .where(or(eq(admins.username, identifier), eq(admins.email, identifier)))
    .limit(1);

  if (adminRows.length === 0) {
    // Equalize computational timing to prevent username/email enumeration
    await verifyPassword(password, DUMMY_SCRYPT_HASH);
    throw new UnauthorizedError('Invalid username/email or password');
  }

  const admin = adminRows[0];

  // 2. Check if account is active (use identical generic error to prevent account-existence leakage)
  if (!admin.isActive) {
    await verifyPassword(password, admin.passwordHash);
    console.warn(`⚠️ [Auth] Login attempt on deactivated account "${identifier}" from IP: ${ipAddress}`);
    throw new UnauthorizedError('Invalid username/email or password');
  }

  // 3. Constant-time password hash verification
  const isValidPassword = await verifyPassword(password, admin.passwordHash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid username/email or password');
  }

  // 4. Generate cryptographically secure session token & 7-day expiry
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 5. Persist session to database
  await db.insert(adminSessions).values({
    id: token,
    adminId: admin.id,
    ipAddress: ipAddress ? ipAddress.slice(0, 45) : null,
    userAgent,
    expiresAt,
  });

  const adminProfile: AuthenticatedAdmin = {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    fullName: admin.fullName,
    role: admin.role as AuthenticatedAdmin['role'],
  };

  // 6. Cache in memory and set secure host-only cookie
  cacheSession(token, adminProfile, expiresAt);
  res.cookie(ADMIN_COOKIE_NAME, token, getAdminCookieOptions(req));

  sendSuccess(res, { admin: adminProfile });
}

/**
 * POST /api/v1/admin/auth/logout
 * Terminates the current admin session, evicts from cache, and clears the cookie.
 */
export async function logoutController(req: Request, res: Response): Promise<void> {
  const token =
    req.sessionId ||
    req.cookies?.[ADMIN_COOKIE_NAME] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (token && typeof token === 'string') {
    evictSessionCache(token);
    await db.delete(adminSessions).where(eq(adminSessions.id, token)).catch(() => {});
  }

  res.clearCookie(ADMIN_COOKIE_NAME, { path: '/api/v1/admin' });
  sendSuccess(res, { message: 'Logged out successfully' });
}

/**
 * GET /api/v1/admin/auth/me
 * Retrieves current authenticated admin profile and role.
 */
export async function getMeController(req: Request, res: Response): Promise<void> {
  if (!req.admin) {
    throw new UnauthorizedError('Not authenticated');
  }

  sendSuccess(res, { admin: req.admin });
}

/**
 * POST /api/v1/admin/auth/logout-all
 * Remote session revocation: Deletes all active sessions for the current admin across all devices.
 */
export async function logoutAllController(req: Request, res: Response): Promise<void> {
  if (!req.admin) {
    throw new UnauthorizedError('Not authenticated');
  }

  const adminId = req.admin.id;
  evictAdminSessionsCache(adminId);

  await db.delete(adminSessions).where(eq(adminSessions.adminId, adminId));

  res.clearCookie(ADMIN_COOKIE_NAME, { path: '/api/v1/admin' });
  sendSuccess(res, { message: 'All sessions terminated successfully' });
}
