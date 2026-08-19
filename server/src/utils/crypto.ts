import crypto from 'crypto';

/**
 * Hash a plain text password using Node.js scrypt with a cryptographically secure random salt.
 * Output format: scrypt:<salt_hex>:<derived_key_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a plain text password against a stored scrypt hash using constant-time comparison
 * to prevent timing side-channel attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, salt, originalKeyHex] = parts;
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const originalKey = Buffer.from(originalKeyHex, 'hex');
      if (derivedKey.length !== originalKey.length) {
        return resolve(false);
      }
      resolve(crypto.timingSafeEqual(derivedKey, originalKey));
    });
  });
}

/**
 * Generate a cryptographically secure 64-character hex session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
