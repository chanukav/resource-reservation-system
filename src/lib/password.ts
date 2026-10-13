import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

/**
 * Generates a secure PBKDF2-SHA512 password hash with a random 16-byte salt.
 * Formatted as `${salt}:${hash}`.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Validates a plaintext password against a stored PBKDF2-SHA512 hash
 * using constant-time buffer comparison to prevent timing side-channel attacks.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    const keyBuf = Buffer.from(key, "hex");
    const hashBuf = Buffer.from(hash, "hex");
    if (keyBuf.length !== hashBuf.length) return false;
    return timingSafeEqual(keyBuf, hashBuf);
  } catch {
    return false;
  }
}
