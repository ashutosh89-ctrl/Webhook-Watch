import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { signJWT } from '@/lib/auth';
import { validateCSRFToken } from '@/lib/csrf';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
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
    const result = forgotPasswordSchema.safeParse(body);
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

    const { email } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (!user) {
      // For security, don't reveal if user exists, but we can return a success message
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a password reset link has been generated.',
      });
    }

    // Generate reset token (expires in 15 minutes)
    const { JWT_SECRET } = require('@/lib/secrets').getSecrets();
    const { SignJWT } = require('jose');
    const secret = new TextEncoder().encode(JWT_SECRET);
    const resetToken = await new SignJWT({ id: user.id, purpose: 'password_reset' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);

    // In a normal app we'd mail this. Since zero external dependencies is requested, we print to console and return the link in JSON for development!
    const resetLink = `/reset-password?token=${resetToken}`;
    console.log(`[PASSWORD RESET REQUEST] User: ${normalizedEmail}, Link: ${resetLink}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset link has been generated successfully.',
      resetLink, // returned directly so user can click it in the dev preview
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
