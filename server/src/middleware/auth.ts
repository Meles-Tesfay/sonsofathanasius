import { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';
import { db } from '../db/index.js';
import { admins, adminSessions } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { config } from '../config/index.js';
import { UnauthorizedError, ForbiddenError } from './errorHandler.js';

export const ADMIN_COOKIE_NAME = 'soa_admin_session';

export interface AuthenticatedAdmin {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  role: 'superadmin' | 'editor' | 'translator';
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
      sessionId?: string;
    }
  }
}

interface CachedSession {
  admin: AuthenticatedAdmin;
  expiresAt: number;
}

// 10-second in-memory session buffer for high performance with bounded revocation propagation
const sessionCache = new LRUCache<string, CachedSession>({
  max: 1000,
  ttl: 10_000,
});

/**
 * Sweep expired sessions from the database
 */
export async function sweepExpiredSessions(): Promise<number> {
  try {
    const result = await db.delete(adminSessions).where(sql`${adminSessions.expiresAt} < NOW()`);
    return (result as any)?.[0]?.affectedRows ?? 0;
  } catch (err) {
    console.error('⚠️ [Auth] Failed to sweep expired sessions:', err);
    return 0;
  }
}

// Periodic cleanup every 24 hours
const sweepInterval = setInterval(() => {
  void sweepExpiredSessions();
}, 24 * 60 * 60 * 1000);

if (sweepInterval.unref) {
  sweepInterval.unref();
}

/**
 * Cookie options for host-only, XSS-immune, path-scoped admin session tokens
 */
export function getAdminCookieOptions(req?: Request) {
  const isSecure =
    config.cookieSecure ||
    (req ? req.secure || req.headers['x-forwarded-proto'] === 'https' : false);

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'strict' as const,
    path: '/api/v1/admin',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

/**
 * Evict a session from in-memory cache upon logout
 */
export function evictSessionCache(token: string): void {
  sessionCache.delete(token);
}

/**
 * Evict all sessions for a specific admin ID from in-memory cache
 */
export function evictAdminSessionsCache(adminId: number): void {
  const tokensToDelete: string[] = [];
  for (const [token, entry] of sessionCache.entries()) {
    if (entry && entry.admin.id === adminId) {
      tokensToDelete.push(token);
    }
  }
  for (const token of tokensToDelete) {
    sessionCache.delete(token);
  }
}

/**
 * Cache an authenticated session in memory
 */
export function cacheSession(token: string, admin: AuthenticatedAdmin, expiresAt: Date): void {
  sessionCache.set(token, {
    admin,
    expiresAt: expiresAt.getTime(),
  });
}

/**
 * Core Session Verification Middleware.
 * Validates the host-only cookie or Authorization Bearer header against DB / LRU cache.
 */
export async function verifyAdminSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken =
      req.cookies?.[ADMIN_COOKIE_NAME] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    const token = typeof rawToken === 'string' ? rawToken.trim() : '';

    if (!token) {
      return next(new UnauthorizedError('Admin authentication required'));
    }

    // 1. Fast Path: In-memory LRU Cache Hit
    const cached = sessionCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      req.admin = cached.admin;
      req.sessionId = token;
      return next();
    }

    // 2. Database Lookup: Verify session and active admin status
    //    Expiry is computed in SQL (TIMESTAMPDIFF against NOW()) to avoid
    //    driver timezone drift between MariaDB local time and JS UTC.
    const rows = await db
      .select({
        sessionId: adminSessions.id,
        adminId: adminSessions.adminId,
        expiresAt: adminSessions.expiresAt,
        secondsRemaining: sql<number>`TIMESTAMPDIFF(SECOND, NOW(), ${adminSessions.expiresAt})`,
        username: admins.username,
        email: admins.email,
        fullName: admins.fullName,
        role: admins.role,
        isActive: admins.isActive,
      })
      .from(adminSessions)
      .innerJoin(admins, eq(adminSessions.adminId, admins.id))
      .where(eq(adminSessions.id, token))
      .limit(1);

    if (rows.length === 0) {
      res.clearCookie(ADMIN_COOKIE_NAME, { path: '/api/v1/admin' });
      return next(new UnauthorizedError('Invalid or expired admin session'));
    }

    const sessionRow = rows[0];

    // Check expiry (SQL-computed, timezone-safe)
    if ((sessionRow.secondsRemaining ?? 0) <= 0) {
      // Clean up expired session from DB
      void db.delete(adminSessions).where(eq(adminSessions.id, token)).catch(() => {});
      sessionCache.delete(token);
      res.clearCookie(ADMIN_COOKIE_NAME, { path: '/api/v1/admin' });
      return next(new UnauthorizedError('Session expired. Please log in again.'));
    }

    // Check if admin account is active
    if (!sessionRow.isActive) {
      sessionCache.delete(token);
      res.clearCookie(ADMIN_COOKIE_NAME, { path: '/api/v1/admin' });
      return next(new ForbiddenError('Admin account has been deactivated'));
    }

    const authenticatedAdmin: AuthenticatedAdmin = {
      id: sessionRow.adminId,
      username: sessionRow.username,
      email: sessionRow.email,
      fullName: sessionRow.fullName,
      role: sessionRow.role as AuthenticatedAdmin['role'],
    };

    // Cache in memory with SQL-computed remaining lifetime (timezone-safe)
    cacheSession(token, authenticatedAdmin, new Date(Date.now() + (sessionRow.secondsRemaining ?? 0) * 1000));

    // Update lastActiveAt in background (non-blocking)
    void db
      .update(adminSessions)
      .set({ lastActiveAt: sql`NOW()` })
      .where(eq(adminSessions.id, token))
      .catch(() => {});

    req.admin = authenticatedAdmin;
    req.sessionId = token;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Role-Based Access Control (RBAC) Guard Middleware
 */
export function requireRole(...allowedRoles: Array<'superadmin' | 'editor' | 'translator'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.admin) {
      return next(new UnauthorizedError('Admin authentication required'));
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: Insufficient privileges. Required role: [${allowedRoles.join(', ')}]`
        )
      );
    }

    return next();
  };
}
