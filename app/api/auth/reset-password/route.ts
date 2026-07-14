import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { validateCSRFToken } from '@/lib/csrf';
import { getSecrets } from '@/lib/secrets';
import { jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export async function POST(req: NextRequest) {
  try {
    const csrfValid = await validateCSRFToken(req.headers);
    if (!csrfValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing CSRF token', code: 'INVALID_CSRF' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // Verify token
    let payload: any = null;
    try {
      const { JWT_SECRET } = getSecrets();
      const secret = new TextEncoder().encode(JWT_SECRET);
      const verifyRes = await jwtVerify(token, secret);
      payload = verifyRes.payload;
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: 'Token has expired or is invalid', code: 'INVALID_TOKEN' },
        { status: 400 }
      );
    }

    if (!payload || payload.purpose !== 'password_reset' || !payload.id) {
      return NextResponse.json(
        { success: false, error: 'Token is invalid or has wrong purpose', code: 'INVALID_TOKEN' },
        { status: 400 }
      );
    }

    const userId = payload.id;

    // Check if user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User does not exist', code: 'USER_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Hash and update password
    const passwordHash = await hashPassword(password);
    await db.update(users).set({ password: passwordHash }).where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
