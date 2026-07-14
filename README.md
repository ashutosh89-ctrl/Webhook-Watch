# Webhook Watch 🔔

Webhook Watch is a powerful, developer-first, self-hosted webhook debugger and inspection sandbox. Capture incoming API callbacks in real-time, inspect headers and payload bodies, replay events downstream, and export logs in multiple formats.

---

## Core Features

1. **Universal Callback Catching**: Accepts `GET`, `POST`, `PUT`, `DELETE`, and `PATCH` requests on custom, unique slugs.
2. **At-Rest AES Encryption**: Body payloads and authorization headers are encrypted on disk with `AES-256-GCM` before being committed to SQLite.
3. **SSE Live Streaming**: Captured payloads stream instantly on your dashboard via Server-Sent Events (SSE). No pooling, no refresh.
4. **Interactive Replay & Forward**: Forward any captured webhook to your local developer server (e.g. `localhost:8080`) or production endpoints and inspect downstream latency/responses.
5. **Request Diff & Comparison**: Select exactly two captured payloads to inspect their structural and body differences side-by-side.
6. **Multi-Format Logs Export**: Download request history formatted as standard `JSON`, `CSV`, full `HAR` logs, or a shell script of copy-pasteable `cURL` commands.
7. **Integration Guide**: Built-in copy-paste instructions for Stripe, GitHub, Shopify, and custom webhook integrations.

---

## Tech Stack

- **Framework**: Next.js 15 App Router (React 19 + TypeScript + Server Components)
- **Database**: SQLite backed by **Drizzle ORM** for self-healing zero-config tables.
- **Real-Time**: Server-Sent Events (SSE) via native Node stream connections.
- **Authentication**: Fully self-contained session engine using HTTP-only secure cookies, `bcryptjs` hashing, and `jose` JWT signatures.
- **Styling**: Tailwind CSS default dark slate developer theme.

---

## Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ashutosh89-ctrl/Webhook-Watch.git
   cd webhook-watch
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000 in your browser.

### Production Build
```bash
npm run build
npm start
```

---

## How to Use

1. **Create a Webhook**: Click "Get Your Webhook URL" on the homepage or sign up for persistent webhooks.
2. **Send Requests**: Use the provided URL to send GET, POST, PUT, PATCH, or DELETE requests.
3. **Monitor in Real-Time**: Watch requests appear instantly on your dashboard via SSE.
4. **Inspect Details**: Click any request to view headers, body, query parameters, and metadata.
5. **Replay**: Forward captured requests to any target URL to test your downstream services.
6. **Export**: Download your request history as JSON, CSV, HAR, or cURL scripts.
7. **Compare**: Select two requests to see a side-by-side diff of their differences.

---

## License

Proprietary License
Copyright (c) 2026 Ashutosh Mishra

You are granted permission to:
✅ Install and use this software for personal or commercial purposes
✅ Host this software on your own infrastructure

You are NOT permitted to:
❌ Modify, adapt, or create derivative works
❌ Redistribute, sublicense, or transfer this software
❌ Reverse engineer, decompile, or disassemble

Feedback & Feature Requests: myserio26@gmail.com

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
