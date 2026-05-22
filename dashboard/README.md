# dashboard/

Next.js real-time security monitoring dashboard for PromptShield.

## What it does

- **Live feed** — WebSocket-connected stream of incidents as they happen
- **Incidents table** — paginated, filterable log of all detections with full payload details
- **Analytics** — charts for attack trends, severity distribution, attack type breakdown
- **Policy editor** — YAML editor (Monaco) to edit and activate detection policies without restarting the gateway
- **Settings** — configure gateway URL, notification preferences

## Quick start

```bash
cd dashboard
npm install

# Point at the running gateway
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Open: http://localhost:3000

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | PromptShield Gateway base URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | WebSocket URL (derived from API URL if unset) |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with demo + quick stats |
| `/live` | Real-time incident stream via WebSocket |
| `/incidents` | Full incident log with filters |
| `/analytics` | Charts and trend analysis |
| `/policies` | YAML policy editor |
| `/settings` | Dashboard configuration |

## Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Code editor**: Monaco Editor (for YAML policies)
- **State**: Zustand
- **Realtime**: native WebSocket via `WsProvider` context
- **Notifications**: Sonner toast library

## Build for production

```bash
npm run build
npm start
# or: NEXT_PUBLIC_API_URL=https://your-gateway.com npm run build
```

## Key components

```
app/
├── layout.tsx          # Root layout with sidebar + WsProvider
├── page.tsx            # Landing / home page
├── not-found.tsx       # Custom 404 page
├── live/page.tsx       # Real-time WebSocket feed
├── incidents/page.tsx  # Incident log
├── analytics/page.tsx  # Charts
├── policies/page.tsx   # YAML policy editor
└── settings/page.tsx   # Settings

components/dashboard/
├── Sidebar.tsx         # Navigation sidebar
├── WsProvider.tsx      # WebSocket context (broadcasts to all consumers)
└── CommandPalette.tsx  # ⌘K command palette
```
