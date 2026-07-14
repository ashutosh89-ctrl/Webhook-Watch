import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { getCurrentUser, clearAuthCookie } from '@/lib/auth';
import { validateCSRFToken } from '@/lib/csrf';
import { eq } from 'drizzle-orm';

export async function DELETE(req: NextRequest) {
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

    // Delete user from DB (Cascades webhooks & requests due to foreign keys)
    await db.delete(users).where(eq(users.id, user.id));

    // Clear session cookies
    await clearAuthCookie();

    return NextResponse.json({
      success: true,
      message: 'Account and associated webhooks deleted successfully.',
    });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
