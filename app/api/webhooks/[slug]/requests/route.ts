import { NextRequest, NextResponse } from 'next/server';
import { db, webhooks, requests } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { validateCSRFToken } from '@/lib/csrf';
import { eq, and, desc } from 'drizzle-orm';

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Fetch the webhook
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
          { success: false, error: 'Unauthorized to view requests', code: 'UNAUTHORIZED' },
          { status: 403 }
        );
      }
    }

    // Fetch requests sorted by newest first
    const dbRequests = await db
      .select()
      .from(requests)
      .where(eq(requests.webhookId, webhook.id))
      .orderBy(desc(requests.createdAt));

    // Decrypt the headers and body of each request
    const decryptedRequests = dbRequests.map((r) => {
      let headersObj = {};
      let bodyText = '';
      try {
        if (r.headers) {
          headersObj = JSON.parse(decrypt(r.headers));
        }
      } catch (e) {
        console.error('Failed to parse headers for request:', r.id, e);
      }

      try {
        if (r.body) {
          bodyText = decrypt(r.body);
        }
      } catch (e) {
        console.error('Failed to decrypt body for request:', r.id, e);
      }

      let parsedQuery = {};
      try {
        if (r.query) {
          parsedQuery = JSON.parse(r.query);
        }
      } catch (e) {
        // Query might be plain string
      }

      return {
        id: r.id,
        webhookId: r.webhookId,
        method: r.method,
        headers: headersObj,
        body: bodyText,
        query: parsedQuery,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        statusCode: r.statusCode,
        responseTime: r.responseTime,
        replayCount: r.replayCount,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      requests: decryptedRequests,
    });
  } catch (error: any) {
    console.error('Fetch requests error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // CSRF Check
    const csrfValid = await validateCSRFToken(req.headers);
    if (!csrfValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing CSRF token', code: 'INVALID_CSRF' },
        { status: 403 }
      );
    }

    // Fetch the webhook
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
          { success: false, error: 'Unauthorized to delete requests', code: 'UNAUTHORIZED' },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('id');

    if (requestId) {
      // Delete a single request
      await db
        .delete(requests)
        .where(and(eq(requests.id, requestId), eq(requests.webhookId, webhook.id)));

      return NextResponse.json({
        success: true,
        message: 'Request deleted successfully.',
      });
    } else {
      // Clear all requests
      await db.delete(requests).where(eq(requests.webhookId, webhook.id));
      
      // Reset request count to 0
      await db
        .update(webhooks)
        .set({ requestCount: 0 })
        .where(eq(webhooks.id, webhook.id));

      return NextResponse.json({
        success: true,
        message: 'All requests cleared successfully.',
      });
    }
  } catch (error: any) {
    console.error('Delete requests error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
