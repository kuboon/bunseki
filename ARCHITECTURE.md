# Bunseki Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Bunseki Analytics                        │
│                     (Deno + Hono.js + KV)                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐                      ┌──────────────────┐
│   Browser        │                      │   Server App     │
│   Clients        │                      │   (Deno/Node)    │
└────────┬─────────┘                      └────────┬─────────┘
         │                                         │
         │ POST /domains/:domain/browser           │ POST /domains/:domain/server
         │ (CORS, No Auth)                         │ (HMAC Signature)
         │                                         │
         └─────────────┬───────────────────────────┘
                       ▼
         ┌─────────────────────────────┐
         │     Hono.js Router          │
         │  - Domain Validation        │
         │  - CORS Middleware          │
         │  - arktype Validation       │
         │  - Signature Middleware     │
         └─────────────┬───────────────┘
                       ▼
         ┌─────────────────────────────┐
         │     Storage Layer           │
         │     (storage.ts)            │
         └─────────────┬───────────────┘
                       ▼
         ┌─────────────────────────────┐
         │        Deno KV              │
         │  ┌─────────────────────┐   │
         │  │ Events (30 days)    │   │
         │  │ - browser           │   │
         │  │ - server            │   │
         │  │ - errors            │   │
         │  ├─────────────────────┤   │
         │  │ Sessions (永久)      │   │
         │  │ - domain/date/id    │   │
         │  ├─────────────────────┤   │
         │  │ Daily Stats         │   │
         │  │ - aggregated data   │   │
         │  ├─────────────────────┤   │
         │  │ Signing Keys        │   │
         │  │ - per domain        │   │
         │  └─────────────────────┘   │
         └─────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Background Task (Cron)                        │
│                  deno task cleanup                               │
│  - Aggregates data older than 30 days                           │
│  - Deletes raw events                                            │
│  - Preserves daily statistics                                    │
│  - Keeps sessions for accurate counts                            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Browser Analytics Flow
```
Browser Page Load
    │
    ├─► Track Page View
    │   ├─► Collect: URL, referrer, screen, language, sessionId
    │   ├─► POST to /domains/o.kbn.one/browser
    │   ├─► CORS validation (origin check)
    │   ├─► Domain validation
    │   ├─► arktype validation
    │   ├─► Save to KV: domain/events/browser/timestamp
    │   └─► Save session: domain/sessions/date/sessionId
    │
    └─► Track Errors
        ├─► window.addEventListener('error')
        ├─► Collect: message, stack, url
        ├─► POST to /domains/o.kbn.one/browser/error
        ├─► arktype validation
        └─► Save to KV: domain/events/error/timestamp
```

### Server Analytics Flow
```
Incoming Request to Your App
    │
    ├─► Middleware: Start timer
    │
    ├─► Process Request
    │
    ├─► Middleware: Calculate duration
    │
    ├─► Prepare data: endpoint, method, statusCode, duration
    │
    ├─► Sign with HMAC-SHA256
    │   ├─► Get signing key from environment
    │   ├─► Generate signature over JSON body
    │   └─► Add x-signature header
    │
    ├─► POST to /domains/o.kbn.one/server
    │
    ├─► Server validates signature (middleware)
    │   ├─► Get key from KV: domain/keys
    │   ├─► Verify HMAC signature
    │   └─► Reject if invalid
    │
    ├─► arktype validation
    │
    └─► Save to KV: domain/events/server/timestamp
```

## Endpoints

```
GET  /                                    Health check
POST /domains/:domain/browser             Browser page view tracking
POST /domains/:domain/browser/error       Browser error reporting  
POST /domains/:domain/server              Server request tracking
POST /domains/:domain/server/error        Server error reporting
```

## Domain Configuration

```typescript
// types.ts
export const ALLOWED_DOMAINS = [
  "o.kbn.one",
  "dd2030.org"
] as const;
```

To add a new domain:
1. Add to ALLOWED_DOMAINS array
2. Restart server
3. Get signing key: `deno task show-key`

## Security Model

### Browser Endpoints
- ✅ CORS enabled with origin validation
- ✅ Validates origin matches allowed domains (including subdomains)
- ✅ No authentication required (public tracking)
- ✅ arktype validation on required fields
- ✅ Domain whitelist enforced

### Server Endpoints  
- ✅ HMAC-SHA256 signature required (as Hono middleware)
- ✅ Keys automatically generated and stored in KV
- ✅ One key per domain
- ✅ Keys never exposed (use `deno task show-key`)
- ✅ arktype validation on required fields
- ✅ Domain whitelist enforced

## Data Lifecycle

```
Day 0-30: Raw Events
├─► Browser events
├─► Server events
└─► Error events

Day 30: Cleanup Task Runs
├─► Aggregate by date
│   ├─► Count page views
│   ├─► Count unique sessions (from permanent store)
│   ├─► Count errors
│   ├─► Count server requests
│   └─► Calculate average duration
├─► Save daily statistics
└─► Delete raw events

Day 31+: Daily Statistics Only
├─► Aggregated metrics per date
├─► Session data preserved
└─► Storage optimized
```

## TypeScript Types

```typescript
interface BrowserEvent {
  domain: AllowedDomain;
  timestamp: number;
  url: string;
  referrer?: string;
  userAgent?: string;
  screenResolution?: string;
  language?: string;
  sessionId?: string;
}

interface ServerEvent {
  domain: AllowedDomain;
  timestamp: number;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  ip?: string;
}

interface ErrorEvent {
  domain: AllowedDomain;
  timestamp: number;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  type: "browser" | "server";
}

interface DailyStats {
  domain: AllowedDomain;
  date: string; // YYYY-MM-DD
  pageViews: number;
  uniqueSessions: number;
  errors: number;
  serverRequests: number;
  avgDuration: number;
}
```

## Validation with arktype

```typescript
// validation.ts
import { type } from "arktype";

export const browserEventSchema = type({
  "url": "string",
  "referrer?": "string",
  "screenResolution?": "string",
  "language?": "string",
  "sessionId?": "string",
});

// Used in Hono endpoints:
validator("json", (value, c) => {
  const parsed = browserEventSchema(value);
  if (parsed instanceof type.errors) {
    return c.json({ error: "Validation failed", details: parsed.summary }, 400);
  }
  return parsed;
})
```
