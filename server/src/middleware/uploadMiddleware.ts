import multer, { FileFilterCallback } from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request } from 'express';
import { config } from '../config/index.js';

// Configure Multer Disk Storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(config.storage.coversDir)) {
      fs.mkdirSync(config.storage.coversDir, { recursive: true });
    }
    cb(null, config.storage.coversDir);
  },
  filename: (_req, file, cb) => {
    const ext = file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const uniqueName = `cover_${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

// MIME type filter
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimes = ['image/webp', 'image/jpeg', 'image/jpg'];
  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only WebP and JPEG images are permitted.'));
  }
};

export const uploadCover = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024, // 500 KB strict limit (client-side compressed)
    files: 1,
  },
}).single('cover');
