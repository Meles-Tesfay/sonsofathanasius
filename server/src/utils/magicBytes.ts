import fs from 'fs';

/**
 * Validates image magic bytes to ensure file is genuinely WebP or JPEG
 * - WebP: Starts with 'RIFF' (0x52 0x49 0x46 0x46), has 'WEBP' at offset 8 (0x57 0x45 0x42 0x50)
 * - JPEG: Starts with 0xFF 0xD8 0xFF
 */
export async function verifyImageMagicBytes(filePath: string): Promise<{ isValid: boolean; format?: 'webp' | 'jpeg' }> {
  let handle: fs.promises.FileHandle | null = null;
  try {
    handle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, 12, 0);

    // 1. Check JPEG magic bytes: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true, format: 'jpeg' };
    }

    // 2. Check WebP magic bytes: RIFF....WEBP
    const isRiff = buffer.subarray(0, 4).toString('ascii') === 'RIFF';
    const isWebp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    if (isRiff && isWebp) {
      return { isValid: true, format: 'webp' };
    }

    return { isValid: false };
  } catch {
    return { isValid: false };
  } finally {
    if (handle) {
      try {
        await handle.close();
      } catch {
        // Ignore handle close error
      }
    }
  }
}
