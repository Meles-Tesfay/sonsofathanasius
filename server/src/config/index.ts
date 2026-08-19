import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first (if present), then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sonsofathanasius',
  },
  cache: {
    ttl: Number(process.env.CACHE_DEFAULT_TTL) || 600,
  },
  jwtSecret: process.env.JWT_SECRET || 'default_secret_key_change_me',
  session: {
    cookieName: 'soa_admin_session',
    cookiePath: '/api/v1/admin',
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,       // 7 days
    sessionCacheTtlMs: 60_000,                 // 60s LRU buffer for verifyAdminSession
    sessionCacheMax: 100,                      // max cached sessions
    bcryptRounds: 12,
  },
  storage: {
    uploadsDir: process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads'),
    get coversDir(): string {
      return path.join(this.uploadsDir, 'covers');
    },
    get pdfDir(): string {
      return path.join(this.uploadsDir, 'pdf');
    },
    fontsDir: process.env.FONTS_DIR || path.resolve(process.cwd(), 'assets/fonts'),
  },
};
