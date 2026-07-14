import { NextRequest, NextResponse } from 'next/server';
import { db, webhooks } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      // Return empty list if not logged in (anonymous users don't have persistent lists)
      return NextResponse.json({ success: true, webhooks: [] });
    }

    const userWebhooks = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.userId, user.id))
      .orderBy(desc(webhooks.createdAt));

    return NextResponse.json({
      success: true,
      webhooks: userWebhooks.map((w) => ({
        id: w.id,
        slug: w.slug,
        label: w.label,
        isPro: w.isPro === 1,
        requestCount: w.requestCount,
        dailyLimit: w.dailyLimit,
        expiresAt: w.expiresAt,
        createdAt: w.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('List user webhooks error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
