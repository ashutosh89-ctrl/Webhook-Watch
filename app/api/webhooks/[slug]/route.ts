import { NextRequest, NextResponse } from 'next/server';
import { db, webhooks } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.slug, slug)).limit(1);

    if (!webhook) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Authorization checks
    if (webhook.userId) {
      const user = await getCurrentUser();
      if (!user || user.id !== webhook.userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access to webhook details', code: 'UNAUTHORIZED' },
          { status: 403 }
        );
      }
    }

    // Check expiration for anonymous
    if (webhook.expiresAt && new Date(webhook.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Webhook has expired', code: 'EXPIRED' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        slug: webhook.slug,
        label: webhook.label,
        userId: webhook.userId,
        isPro: webhook.isPro === 1,
        requestCount: webhook.requestCount,
        dailyLimit: webhook.dailyLimit,
        expiresAt: webhook.expiresAt,
        createdAt: webhook.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Fetch webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.slug, slug)).limit(1);

    if (!webhook) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Authorization checks
    if (webhook.userId) {
      const user = await getCurrentUser();
      if (!user || user.id !== webhook.userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized to delete this webhook', code: 'UNAUTHORIZED' },
          { status: 403 }
        );
      }
    }

    // Delete the webhook itself (cascades to requests and replay_logs)
    await db.delete(webhooks).where(eq(webhooks.id, webhook.id));

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
