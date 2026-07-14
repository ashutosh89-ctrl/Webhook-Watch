import { NextRequest, NextResponse } from 'next/server';
import { db, webhooks, requests } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { eq, desc } from 'drizzle-orm';

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json'; // json, csv, har, curl

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

    // Fetch requests
    const dbRequests = await db
      .select()
      .from(requests)
      .where(eq(requests.webhookId, webhook.id))
      .orderBy(desc(requests.createdAt));

    // Decrypt requests
    const decryptedRequests = dbRequests.map((r) => {
      let headersObj: Record<string, string> = {};
      let bodyText = '';
      try {
        if (r.headers) {
          headersObj = JSON.parse(decrypt(r.headers));
        }
      } catch (e) {
        // Fallback
      }
      try {
        if (r.body) {
          bodyText = decrypt(r.body);
        }
      } catch (e) {
        // Fallback
      }
      let queryObj = {};
      try {
        if (r.query) {
          queryObj = JSON.parse(r.query);
        }
      } catch (e) {
        // Fallback
      }

      return {
        id: r.id,
        method: r.method,
        headers: headersObj,
        body: bodyText,
        query: queryObj,
        ipAddress: r.ipAddress || '127.0.0.1',
        userAgent: r.userAgent || 'Unknown',
        statusCode: r.statusCode || 200,
        responseTime: r.responseTime || 0,
        createdAt: r.createdAt,
      };
    });

    const filename = `webhook_export_${slug}_${Date.now()}`;

    if (format === 'csv') {
      // Generate CSV
      const headers = ['ID', 'Method', 'IP Address', 'User Agent', 'Status Code', 'Response Time (ms)', 'Query Params', 'Body', 'Created At'];
      const rows = decryptedRequests.map((r) => [
        r.id,
        r.method,
        r.ipAddress,
        r.userAgent.replace(/"/g, '""'),
        r.statusCode,
        r.responseTime,
        JSON.stringify(r.query).replace(/"/g, '""'),
        r.body.replace(/"/g, '""'),
        r.createdAt,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((val) => `"${val}"`).join(',')),
      ].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    if (format === 'har') {
      // Generate HAR
      const harEntries = decryptedRequests.map((r) => {
        const headersArray = Object.entries(r.headers).map(([name, value]) => ({ name, value }));
        const queryArray = Object.entries(r.query).map(([name, value]) => ({ name, value: String(value) }));

        return {
          startedDateTime: r.createdAt,
          time: r.responseTime,
          request: {
            method: r.method,
            url: `${process.env.APP_URL || 'http://localhost:3000'}/webhook/${slug}`,
            httpVersion: 'HTTP/1.1',
            headers: headersArray,
            queryString: queryArray,
            cookies: [],
            headersSize: -1,
            bodySize: r.body.length,
            postData: r.body ? {
              mimeType: r.headers['content-type'] || 'text/plain',
              text: r.body,
            } : undefined,
          },
          response: {
            status: r.statusCode,
            statusText: 'OK',
            httpVersion: 'HTTP/1.1',
            headers: [],
            cookies: [],
            content: {
              size: 20,
              mimeType: 'application/json',
              text: JSON.stringify({ received: true, id: r.id }),
            },
            redirectURL: '',
            headersSize: -1,
            bodySize: -1,
          },
          cache: {},
          timings: {
            send: 0,
            wait: r.responseTime,
            receive: 0,
          },
        };
      });

      const harContent = JSON.stringify({
        log: {
          version: '1.2',
          creator: {
            name: 'Webhook Watch',
            version: '1.0.0',
          },
          entries: harEntries,
        },
      }, null, 2);

      return new Response(harContent, {
        headers: {
          'Content-Type': 'application/har+json',
          'Content-Disposition': `attachment; filename="${filename}.har"`,
        },
      });
    }

    if (format === 'curl') {
      // Generate cURL script
      const curlCommands = decryptedRequests.map((r) => {
        const headerFlags = Object.entries(r.headers)
          .map(([name, value]) => `-H "${name}: ${value}"`)
          .join(' ');

        const queryStr = Object.keys(r.query).length > 0
          ? '?' + new URLSearchParams(r.query as Record<string, string>).toString()
          : '';

        const bodyFlag = r.body ? `-d '${r.body.replace(/'/g, "'\\''")}'` : '';

        return `curl -X ${r.method} ${headerFlags} ${bodyFlag} "${process.env.APP_URL || 'http://localhost:3000'}/webhook/${slug}${queryStr}"`;
      });

      const curlContent = `#!/bin/bash\n\n# Webhook Watch cURL Export for slug: ${slug}\n# Total Requests: ${decryptedRequests.length}\n\n` + curlCommands.join('\n\n');

      return new Response(curlContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${filename}.sh"`,
        },
      });
    }

    // Default to JSON
    const jsonContent = JSON.stringify(decryptedRequests, null, 2);
    return new Response(jsonContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Export requests error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
