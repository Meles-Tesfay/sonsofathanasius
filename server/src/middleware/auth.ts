import { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';
import { db } from '../db/index.js';
import { adminSessions, admins } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { config } from '../config/index.js';
import { sendError } from '../utils/response.js';

// ══════════════════════════════════════════════════════════════════
// Session Verification Middleware (Phase B7.1)
//
// Validates the httpOnly session cookie against the admin_sessions
// DB table, with a 60-second LRU cache buffer to avoid a DB hit on
// every single admin request.
// ══════════════════════════════════════════════════════════════════

interface CachedAdminSession {
  id: number;
  username: string;
  email: string;
  role: 'superadmin' | 'editor' | 'translator';
}

// 60-second LRU session cache (prevents DB lookup on every request)
const sessionCache = new LRUCache<string, CachedAdminSession>({
  max: config.session.sessionCacheMax,
  ttl: config.session.sessionCacheTtlMs,
});

/**
 * Express middleware: Extracts session cookie, validates against DB
 * (with LRU cache), and attaches req.admin on success.
 */
export async function verifyAdminSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token: string | undefined = req.cookies?.[config.session.cookieName];

  if (!token || typeof token !== 'string' || token.length < 32) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  // 1. Check LRU cache first (sub-ms hit)
  const cached = sessionCache.get(token);
  if (cached) {
    req.admin = cached;
    return next();
  }

  // 2. Validate against the admin_sessions DB table
  try {
    const rows = await db
      .select({
        adminId: admins.id,
        username: admins.username,
        email: admins.email,
        role: admins.role,
        isActive: admins.isActive,
      })
      .from(adminSessions)
      .innerJoin(admins, eq(admins.id, adminSessions.adminId))
      .where(
        and(
          eq(adminSessions.id, token),
          gt(adminSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (rows.length === 0) {
      clearSessionCookie(res);
      sendError(res, 'Session expired or invalid', 401);
      return;
    }

    const row = rows[0];

    // 3. Verify admin account is still active
    if (!row.isActive) {
      clearSessionCookie(res);
      sendError(res, 'Account is disabled', 403);
      return;
    }

    // 4. Cache the validated session for 60 seconds
    const adminData: CachedAdminSession = {
      id: row.adminId,
      username: row.username,
      email: row.email,
      role: row.role as CachedAdminSession['role'],
    };
    sessionCache.set(token, adminData);
    req.admin = adminData;

    // 5. Update lastActiveAt asynchronously (fire-and-forget)
    db.update(adminSessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(adminSessions.id, token))
      .catch(() => { /* Non-critical: best-effort activity tracking */ });

    return next();
  } catch (err) {
    console.error('❌ [Auth] Session verification failed:', err);
    sendError(res, 'Internal authentication error', 500);
    return;
  }
}

// ══════════════════════════════════════════════════════════════════
// Cookie Helpers
// ══════════════════════════════════════════════════════════════════

/**
 * Set the admin session cookie with all security flags.
 * Domain attribute is intentionally omitted → host-only cookie.
 */
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(config.session.cookieName, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: config.session.cookiePath,
    maxAge: config.session.maxAgeMs,
    // No `domain` attribute → host-only scoping (zero cross-subdomain exposure)
  });
}

/**
 * Clear the admin session cookie from the browser.
 */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.session.cookieName, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: config.session.cookiePath,
  });
}

/**
 * Evict a specific session from the LRU cache.
 * Called on logout to ensure immediate invalidation.
 */
export function invalidateSessionCache(token: string): void {
  sessionCache.delete(token);
}

/**
 * Clear entire session cache.
 * Called on logout-all to force re-validation against DB.
 */
export function clearEntireSessionCache(): void {
  sessionCache.clear();
}
