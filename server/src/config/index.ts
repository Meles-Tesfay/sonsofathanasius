import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first (if present), then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase();
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';
const isDevelopment = nodeEnv === 'development';

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  isProduction,
  isTest,
  isDevelopment,
  enableSwagger: !isProduction,
  enableMetrics: !isProduction,
  cookieSecure: isProduction,
  clientUrl: process.env.CLIENT_URL || (isProduction ? 'https://www.sonsofathanasius.com' : 'http://localhost:5173'),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sonsofathanasius',
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
