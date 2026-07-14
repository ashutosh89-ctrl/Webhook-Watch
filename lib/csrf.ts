import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getSecrets } from './secrets';

export async function generateCSRFToken(): Promise<string> {
  const { JWT_SECRET } = getSecrets();
  const timestamp = Date.now().toString();
  const randomHex = crypto.randomBytes(16).toString('hex');
  const message = `${timestamp}.${randomHex}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(message).digest('hex');
  const token = `${message}.${signature}`;

  try {
    const cookieStore = await cookies();
    cookieStore.set('ww_csrf', token, {
      httpOnly: false, // Set to false so the client JS can read it to submit with headers
      secure: true, // Must be true for sameSite: 'none'
      sameSite: 'none', // Set to 'none' so it works properly in iframe previews
      path: '/',
    });
  } catch (e) {
    // cookies().set can fail during read-only/GET operations in some server environments, ignore gracefully
  }

  return token;
}

export async function verifyCSRF() {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('ww_csrf')?.value;
  if (!cookieToken) return false;
  return cookieToken;
}

// Stateless verification of the signed token
export async function validateCSRFToken(headers: Headers): Promise<boolean> {
  const headerToken = headers.get('x-csrf-token') || headers.get('X-CSRF-Token');
  if (!headerToken) return false;

  const parts = headerToken.split('.');
  if (parts.length !== 3) return false;

  const [timestamp, randomHex, signature] = parts;

  // Verify token age (must be less than 24 hours old)
  const tokenTime = parseInt(timestamp, 10);
  if (isNaN(tokenTime)) return false;

  const maxAge = 24 * 60 * 60 * 1000;
  if (Date.now() - tokenTime > maxAge || Date.now() - tokenTime < -60000) {
    return false; // Expired or future dated (allowing 1 min clock skew)
  }

  // Re-calculate the expected signature
  const { JWT_SECRET } = getSecrets();
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${timestamp}.${randomHex}`)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (e) {
    return false;
  }
}
