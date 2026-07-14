# Webhook Watch 🔔

Webhook Watch is a powerful, developer-first, self-hosted webhook debugger and inspection sandbox. Capture incoming API callbacks in real-time, inspect headers and payload bodies, replay events downstream, and trigger instant channel notifications.

---

## Core features

1. **Universal Callback Catching**: Accepts `GET`, `POST`, `PUT`, `DELETE`, and `PATCH` requests on custom, unique slugs.
2. **At-Rest AES Encryption**: Body payloads and authorization headers are encrypted on disk with `AES-256-GCM` before being committed to SQLite.
3. **SSE Live Streaming**: Captured payloads stream instantly on your dashboard via Server-Sent Events (SSE). No pooling, no refresh.
4. **Interactive Replay & Forward**: Forward any captured webhook to your local developer server (e.g. `localhost:8080`) or production endpoints and inspect downstream latency/responses.
5. **Request Diff & Comparison**: Select exactly two captured payloads to inspect their structural and body differences side-by-side.
6. **Multi-Format Logs Export**: Download request history formatted as standard `JSON`, `CSV`, full `HAR` logs, or a shell script of copy-pasteable `cURL` commands.
7. **Slack Alert Destinations**: Synchronize alert configs so Webhook Watch fires formatted payload previews directly to your team channel.

---

## Tech Stack

- **Framework**: Next.js 15 App Router (React 19 + TypeScript + Server Components)
- **Database**: SQLite backed by **Drizzle ORM** for self-healing zero-config tables.
- **Real-Time**: Server-Sent Events (SSE) via native Node stream connections.
- **Authentication**: Fully self-contained session engine using HTTP-only secure cookies, `bcryptjs` hashing, and `jose` JWT signatures.
- **Styling**: Tailwind CSS default dark slate developer theme.

---

## Deployment Guide (Self-Hosted)

### Using Docker Compose (Recommended)

1. Clone or copy the codebase to your server.
2. Spin up the containers in detached mode:
   ```bash
   docker-compose up -d --build
   ```
3. Open `http://localhost:3000` to access Webhook Watch.
4. Your persistent database resides safely inside the docker volume `webhook-watch-data`.

### Manual Development Launch

1. Install project dependencies:
   ```bash
   npm install
   ```
2. Start the local server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

---

## Developer Overrides (PRO Status)

Webhook Watch includes a self-contained developer tier upgrade. Free accounts get a 24-hour TTL on endpoints and a 100 reqs/day quota limit. 

To upgrade to **PRO** status (persistent webhooks, 10,000 reqs/day quota limit):
1. Sign up/Login to your Webhook Watch account.
2. Head over to **Settings**.
3. Under **Developer Overrides**, submit your local deployment secret key (defaults to `PRO_DEVELOPER_KEY`).
4. Enjoy unlimited, lifetime PRO features!

---

## License & Support

Proprietary License — users are free to install and host Webhook Watch personally but are **NOT** permitted to redistribute modified code. 

Please send feedback, bug logs, and features requests directly to **myserio26@gmail.com**.
