import { NextRequest, NextResponse } from 'next/server';
import { db, webhooks, requests } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { broadcastWebhookEvent } from '@/lib/sse';
import { eq, and, gt, sql } from 'drizzle-orm';
import crypto from 'crypto';

// Unified capture logic for all methods
async function handleWebhookCatch(req: NextRequest, slug: string) {
  const startTime = Date.now();
  try {
    // 1. Fetch webhook details
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.slug, slug)).limit(1);
    if (!webhook) {
      return NextResponse.json(
        { success: false, error: 'Webhook endpoint not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check expiration for anonymous webhooks
    if (webhook.expiresAt) {
      const expires = new Date(webhook.expiresAt);
      if (expires < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Webhook endpoint has expired', code: 'EXPIRED' },
          { status: 410 }
        );
      }
    }

    // 2. Rate limit check (last 24 hours requests) - Raised to high default for all as requested
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(requests)
      .where(
        and(
          eq(requests.webhookId, webhook.id),
          gt(requests.createdAt, twentyFourHoursAgo)
        )
      );

    const requestsInLast24h = Number(countResult?.count || 0);
    const limit = 1000000; // Extremely high limit default for all users

    if (requestsInLast24h >= limit) {
      return NextResponse.json(
        { success: false, error: 'Daily request limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    }

    // 3. Extract request details
    const method = req.method;
    const ipAddress = req.headers.get('x-forwarded-for') || (req as any).ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Get all query params
    const urlObj = new URL(req.url);
    const queryParams: Record<string, string> = {};
    urlObj.searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });

    // Get all headers
    const headersObj: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headersObj[key] = val;
    });

    // Extract body if present
    let bodyText = '';
    try {
      bodyText = await req.text();
    } catch (e) {
      // No body or error reading it
    }

    // 4. Encrypt sensitive fields at rest (headers and body)
    const encryptedHeaders = encrypt(JSON.stringify(headersObj));
    const encryptedBody = encrypt(bodyText);
    const stringifiedQuery = JSON.stringify(queryParams);

    const requestId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const responseTime = Date.now() - startTime;
    const defaultResponseStatus = 200; // Webhook Catcher defaults to 200 OK

    // 5. Insert request into DB
    await db.insert(requests).values({
      id: requestId,
      webhookId: webhook.id,
      method,
      headers: encryptedHeaders,
      body: encryptedBody,
      query: stringifiedQuery,
      ipAddress,
      userAgent,
      statusCode: defaultResponseStatus,
      responseTime,
      createdAt,
    });

    // Increment request count on the webhook row
    await db
      .update(webhooks)
      .set({ requestCount: (webhook.requestCount || 0) + 1 })
      .where(eq(webhooks.id, webhook.id));

    // 6. Broadcast payload to SSE subscribers
    const decryptedPayloadForSSE = {
      id: requestId,
      webhookId: webhook.id,
      method,
      headers: headersObj, // Pass decrypted plain headers
      body: bodyText,      // Pass decrypted plain body
      query: queryParams,  // Pass plain query
      ipAddress,
      userAgent,
      statusCode: defaultResponseStatus,
      responseTime,
      createdAt,
    };
    broadcastWebhookEvent(slug, decryptedPayloadForSSE);

    return NextResponse.json(
      { received: true, id: requestId },
      { status: defaultResponseStatus }
    );
  } catch (error: any) {
    console.error('Webhook catcher error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// Next.js 15 requires awaiting dynamic route params in API Route definitions
type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return handleWebhookCatch(req, slug);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return handleWebhookCatch(req, slug);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return handleWebhookCatch(req, slug);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return handleWebhookCatch(req, slug);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return handleWebhookCatch(req, slug);
}

export async function OPTIONS(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return handleWebhookCatch(req, slug);
}
