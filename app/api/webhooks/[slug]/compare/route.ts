import { NextRequest, NextResponse } from 'next/server';
import { db, webhooks, requests } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { eq, and } from 'drizzle-orm';

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const id1 = searchParams.get('id1');
    const id2 = searchParams.get('id2');

    if (!id1 || !id2) {
      return NextResponse.json(
        { success: false, error: 'Missing request IDs to compare', code: 'MISSING_IDS' },
        { status: 400 }
      );
    }

    // Fetch webhook
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.slug, slug)).limit(1);
    if (!webhook) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Permission check
    if (webhook.userId) {
      const user = await getCurrentUser();
      if (!user || user.id !== webhook.userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 403 }
        );
      }
    }

    // Fetch both requests
    const [req1] = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, id1), eq(requests.webhookId, webhook.id)))
      .limit(1);

    const [req2] = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, id2), eq(requests.webhookId, webhook.id)))
      .limit(1);

    if (!req1 || !req2) {
      return NextResponse.json(
        { success: false, error: 'One or both requests could not be found', code: 'REQUESTS_NOT_FOUND' },
        { status: 404 }
      );
    }

    const decryptRequest = (r: typeof req1) => {
      let headersObj = {};
      let bodyText = '';
      try {
        if (r.headers) {
          headersObj = JSON.parse(decrypt(r.headers));
        }
      } catch (e) {}

      try {
        if (r.body) {
          bodyText = decrypt(r.body);
        }
      } catch (e) {}

      let queryObj = {};
      try {
        if (r.query) {
          queryObj = JSON.parse(r.query);
        }
      } catch (e) {}

      return {
        id: r.id,
        method: r.method,
        headers: headersObj,
        body: bodyText,
        query: queryObj,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        statusCode: r.statusCode,
        responseTime: r.responseTime,
        createdAt: r.createdAt,
      };
    };

    return NextResponse.json({
      success: true,
      request1: decryptRequest(req1),
      request2: decryptRequest(req2),
    });
  } catch (error: any) {
    console.error('Compare requests error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
