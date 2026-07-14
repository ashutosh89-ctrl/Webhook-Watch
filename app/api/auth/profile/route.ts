import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { validateCSRFToken } from '@/lib/csrf';
import { eq, ne, and } from 'drizzle-orm';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
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

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = profileSchema.safeParse(body);
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

    const { name, email, password } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check email uniqueness among other users
    const [existingWithEmail] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, normalizedEmail), ne(users.id, user.id)))
      .limit(1);

    if (existingWithEmail) {
      return NextResponse.json(
        { success: false, error: 'Email already in use by another account', code: 'EMAIL_IN_USE' },
        { status: 409 }
      );
    }

    const updateData: Partial<typeof users.$inferInsert> = {
      name,
      email: normalizedEmail,
    };

    if (password && password.trim().length >= 6) {
      updateData.password = await hashPassword(password);
    }

    await db.update(users).set(updateData).where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user.id,
        name,
        email: normalizedEmail,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
