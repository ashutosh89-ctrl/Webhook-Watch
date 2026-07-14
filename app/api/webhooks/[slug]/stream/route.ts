import { sseEmitter } from '@/lib/sse';
import { NextRequest } from 'next/server';

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  const stream = new ReadableStream({
    start(controller) {
      // Send open event
      const handshake = `event: open\ndata: ${JSON.stringify({ connected: true, slug })}\n\n`;
      controller.enqueue(new TextEncoder().encode(handshake));

      const listener = (data: any) => {
        const msg = `event: request\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(new TextEncoder().encode(msg));
        } catch (e) {
          // Safe guard against closed streams
          sseEmitter.off(`webhook:${slug}`, listener);
        }
      };

      sseEmitter.on(`webhook:${slug}`, listener);

      // Keep connection alive with heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch (e) {
          clearInterval(heartbeatInterval);
          sseEmitter.off(`webhook:${slug}`, listener);
        }
      }, 30000);

      // Handle client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        sseEmitter.off(`webhook:${slug}`, listener);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Content-Encoding': 'none',
    },
  });
}
