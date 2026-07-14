import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { hashPassword, signJWT, setAuthCookie } from '@/lib/auth';
import { validateCSRFToken } from '@/lib/csrf';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // CSRF Check
    const csrfValid = await validateCSRFToken(req.headers);
    if (!csrfValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing CSRF token', code: 'INVALID_CSRF' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = signupSchema.safeParse(body);
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

    const { email, password, name } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists', code: 'EMAIL_EXISTS' },
        { status: 409 }
      );
    }

    // Hash password and insert user
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      password: passwordHash,
      name: name || null,
      isPro: 0,
      createdAt,
    });

    // Sign JWT and set cookie
    const token = await signJWT({ id: userId, email: normalizedEmail });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        name: name || null,
        isPro: false,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
