import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { admins, adminSessions } from '../db/schema.js';
import { eq, or, sql } from 'drizzle-orm';
import { config } from '../config/index.js';
import { LoginSchema } from '../validators/authValidator.js';
import {
  setSessionCookie,
  clearSessionCookie,
  invalidateSessionCache,
  clearEntireSessionCache,
} from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';

// ══════════════════════════════════════════════════════════════════
// 1. LOGIN — POST /api/v1/admin/auth/login
// ══════════════════════════════════════════════════════════════════

export async function login(req: Request, res: Response): Promise<void> {
  // 1. Validate request body
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    sendError(res, `Invalid login payload: ${details}`, 400);
    return;
  }

  const { login: loginInput, password } = parsed.data;

  // 2. Look up admin by username OR email (case-insensitive)
  const normalizedLogin = loginInput.trim().toLowerCase();
  const rows = await db
    .select({
      id: admins.id,
      username: admins.username,
      email: admins.email,
      passwordHash: admins.passwordHash,
      fullName: admins.fullName,
      role: admins.role,
      isActive: admins.isActive,
    })
    .from(admins)
    .where(
      or(
        eq(sql`LOWER(${admins.username})`, normalizedLogin),
        eq(sql`LOWER(${admins.email})`, normalizedLogin)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    sendError(res, 'Invalid credentials', 401);
    return;
  }

  const admin = rows[0];

  // 3. Verify account is active
  if (!admin.isActive) {
    sendError(res, 'Account is disabled. Contact a superadmin.', 403);
    return;
  }

  // 4. Verify password with bcrypt
  const passwordValid = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordValid) {
    sendError(res, 'Invalid credentials', 401);
    return;
  }

  // 5. Generate cryptographically secure session token
  const sessionToken = crypto.randomBytes(64).toString('hex'); // 128 hex chars

  // 6. Insert session into admin_sessions
  const expiresAt = new Date(Date.now() + config.session.maxAgeMs);
  await db.insert(adminSessions).values({
    id: sessionToken,
    adminId: admin.id,
    ipAddress: (req.ip || req.socket.remoteAddress || 'unknown').slice(0, 45),
    userAgent: (req.headers['user-agent'] || 'unknown').slice(0, 500),
    expiresAt,
  });

  // 7. Set host-only httpOnly session cookie
  setSessionCookie(res, sessionToken);

  // 8. Return admin profile (never expose passwordHash)
  sendSuccess(res, {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    fullName: admin.fullName,
    role: admin.role,
  });
}

// ══════════════════════════════════════════════════════════════════
// 2. LOGOUT — POST /api/v1/admin/auth/logout
// ══════════════════════════════════════════════════════════════════

export async function logout(req: Request, res: Response): Promise<void> {
  const token: string | undefined = req.cookies?.[config.session.cookieName];

  if (token) {
    // 1. Delete session from DB
    await db.delete(adminSessions).where(eq(adminSessions.id, token));

    // 2. Evict from LRU cache
    invalidateSessionCache(token);
  }

  // 3. Clear browser cookie
  clearSessionCookie(res);

  sendSuccess(res, { message: 'Logged out successfully' });
}

// ══════════════════════════════════════════════════════════════════
// 3. ME — GET /api/v1/admin/auth/me
// ══════════════════════════════════════════════════════════════════

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.admin) {
    sendError(res, 'Not authenticated', 401);
    return;
  }

  // Fetch full profile from DB (req.admin is the cached minimal version)
  const rows = await db
    .select({
      id: admins.id,
      username: admins.username,
      email: admins.email,
      fullName: admins.fullName,
      role: admins.role,
      createdAt: admins.createdAt,
      updatedAt: admins.updatedAt,
    })
    .from(admins)
    .where(eq(admins.id, req.admin.id))
    .limit(1);

  if (rows.length === 0) {
    sendError(res, 'Admin not found', 404);
    return;
  }

  sendSuccess(res, rows[0]);
}

// ══════════════════════════════════════════════════════════════════
// 4. LOGOUT ALL — POST /api/v1/admin/auth/logout-all
//    Remote revocation: deletes ALL active sessions for this admin.
// ══════════════════════════════════════════════════════════════════

export async function logoutAll(req: Request, res: Response): Promise<void> {
  if (!req.admin) {
    sendError(res, 'Not authenticated', 401);
    return;
  }

  // 1. Delete all sessions for this admin from DB
  const result = await db
    .delete(adminSessions)
    .where(eq(adminSessions.adminId, req.admin.id));

  // 2. Clear entire session LRU cache (can't selectively evict by adminId)
  clearEntireSessionCache();

  // 3. Clear browser cookie
  clearSessionCookie(res);

  sendSuccess(res, {
    message: 'All sessions revoked successfully',
    sessionsRevoked: (result as unknown as [{ affectedRows: number }])[0]?.affectedRows ?? 0,
  });
}
