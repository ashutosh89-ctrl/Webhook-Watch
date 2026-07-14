import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface Secrets {
  JWT_SECRET: string;
  ENCRYPTION_KEY: string; // 32-byte hex key for AES-256-GCM
}

const SECRETS_FILE = path.join(process.cwd(), 'data', 'secrets.json');

export function getSecrets(): Secrets {
  // Try environment first
  if (process.env.JWT_SECRET && process.env.ENCRYPTION_KEY) {
    return {
      JWT_SECRET: process.env.JWT_SECRET,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    };
  }

  // Ensure directories exist
  const dir = path.dirname(SECRETS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Check if secrets.json exists
  if (fs.existsSync(SECRETS_FILE)) {
    try {
      const content = fs.readFileSync(SECRETS_FILE, 'utf-8');
      const parsed = JSON.parse(content) as Secrets;
      if (parsed.JWT_SECRET && parsed.ENCRYPTION_KEY) {
        return parsed;
      }
    } catch (e) {
      console.error('Error reading secrets.json, regenerating', e);
    }
  }

  // Generate new secrets
  const generated: Secrets = {
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'), // 32 bytes = 256 bits for AES-256
  };

  fs.writeFileSync(SECRETS_FILE, JSON.stringify(generated, null, 2), 'utf-8');
  return generated;
}
