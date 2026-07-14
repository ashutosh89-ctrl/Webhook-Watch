import { EventEmitter } from 'events';

const globalForSSE = global as unknown as {
  sseEmitter?: EventEmitter;
};

export const sseEmitter = globalForSSE.sseEmitter || new EventEmitter();

// Max listeners override to avoid warnings if many users open the dashboard
sseEmitter.setMaxListeners(100);

if (process.env.NODE_ENV !== 'production') {
  globalForSSE.sseEmitter = sseEmitter;
}

export function broadcastWebhookEvent(slug: string, data: any) {
  sseEmitter.emit(`webhook:${slug}`, data);
}
