import { NextRequest, NextResponse } from 'next/server';
import { db, webhooks, requests, replayLogs } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { validateCSRFToken } from '@/lib/csrf';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

type RouteParams = { params: Promise<{ slug: string; id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug, id: requestId } = await params;

    // CSRF Check
    const csrfValid = await validateCSRFToken(req.headers);
    if (!csrfValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing CSRF token', code: 'INVALID_CSRF' },
        { status: 403 }
      );
    }

    const bodyData = await req.json();
    const { targetUrl } = bodyData;

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: 'Target URL is required for replay', code: 'MISSING_TARGET_URL' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid Target URL format', code: 'INVALID_URL' },
        { status: 400 }
      );
    }

    // Fetch webhook to check permissions
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.slug, slug)).limit(1);
    if (!webhook) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (webhook.userId) {
      const user = await getCurrentUser();
      if (!user || user.id !== webhook.userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 403 }
        );
      }
    }

    // Fetch request to replay
    const [capturedRequest] = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, requestId), eq(requests.webhookId, webhook.id)))
      .limit(1);

    if (!capturedRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found', code: 'REQUEST_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Decrypt details
    let headersObj: Record<string, string> = {};
    let requestBody = '';
    try {
      if (capturedRequest.headers) {
        headersObj = JSON.parse(decrypt(capturedRequest.headers));
      }
    } catch (e) {}

    try {
      if (capturedRequest.body) {
        requestBody = decrypt(capturedRequest.body);
      }
    } catch (e) {}

    // Prepare headers to forward (exclude system specific headers that might break routing)
    const headersToForward = new Headers();
    const headersToExclude = ['host', 'connection', 'content-length', 'accept-encoding', 'cookie'];
    Object.entries(headersObj).forEach(([name, value]) => {
      if (!headersToExclude.includes(name.toLowerCase())) {
        headersToForward.set(name, value);
      }
    });

    const startTime = Date.now();
    let responseStatus = 0;
    let responsePreview = '';

    try {
      // Execute replay fetch
      const fetchOptions: RequestInit = {
        method: capturedRequest.method,
        headers: headersToForward,
      };

      if (!['get', 'head'].includes(capturedRequest.method.toLowerCase())) {
        fetchOptions.body = requestBody;
      }

      // 5-second timeout for replay to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      fetchOptions.signal = controller.signal;

      const res = await fetch(targetUrl, fetchOptions);
      clearTimeout(timeoutId);

      responseStatus = res.status;
      const responseText = await res.text();
      responsePreview = responseText.slice(0, 1000); // Save a preview of response
    } catch (err: any) {
      responseStatus = 502; // Bad Gateway
      responsePreview = `Replay Failed: ${err.message || 'Unknown network error'}`;
    }

    const responseTime = Date.now() - startTime;
    const replayLogId = crypto.randomUUID();

    // Save Replay Log in SQLite
    await db.insert(replayLogs).values({
      id: replayLogId,
      requestId: capturedRequest.id,
      targetUrl,
      responseStatus,
      responseTime,
      responsePreview,
      createdAt: new Date().toISOString(),
    });

    // Increment Replay Count
    await db
      .update(requests)
      .set({ replayCount: (capturedRequest.replayCount || 0) + 1 })
      .where(eq(requests.id, capturedRequest.id));

    return NextResponse.json({
      success: true,
      log: {
        id: replayLogId,
        targetUrl,
        responseStatus,
        responseTime,
        responsePreview,
      },
    });
  } catch (error: any) {
    console.error('Replay error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
