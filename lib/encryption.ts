import crypto from 'crypto';
import { getSecrets } from './secrets';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  if (!text) return '';
  const { ENCRYPTION_KEY } = getSecrets();
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv_hex:authTag_hex:encrypted_hex
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      // If it's not encrypted in our expected format, return as-is (graceful fallback)
      return encryptedData;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const { ENCRYPTION_KEY } = getSecrets();
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (e) {
    console.error('Decryption failed:', e);
    return '[Error Decrypting Content]';
  }
}
