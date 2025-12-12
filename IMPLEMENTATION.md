# Bunseki - OTLP Telemetry Dashboard

## Implementation Summary

This implementation provides a complete OTLP telemetry collection and visualization system with:

### 1. Storage Layer (`storage/mod.ts`)

- **Deno KV** backend for persistent storage
- **Metrics Storage**: Page view counts aggregated by service/date/path
- **Trace Storage**: Recent spans (30-day retention) for detailed analysis
- **Error Storage**: Deduplicated errors with stack traces (last 50 per service)
- **Service Registry**: Automatic service discovery and tracking

### 2. Collector Integration (`otlp/collector/mod.ts`)

- **Metrics Endpoint** (`/v1/metrics`): Receives and stores page view counters
- **Traces Endpoint** (`/v1/traces`): Stores spans and extracts error events
- Automatic extraction of `service.name` and `url.path` attributes

### 3. Client Dashboard (`client/`)

- **Index Page** (`index.tsx`): Lists all services with activity status
- **Service Dashboard** (`service.page.tsx`): Shows PV graph and recent errors
- **Error Detail** (`error.page.tsx`): Displays error backtraces (placeholder)
- **Lume Static Site Generator**: Pre-builds pages from KV data
- **daisyUI + Tailwind CSS**: Modern, responsive UI components

### 4. Server (`serve.ts`)

- Serves OTLP collector endpoints at `/v1/*`
- Serves static dashboard from `client/_site/`
- Initializes storage on startup

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─→ /v1/metrics (POST)  ──→  Store PV counts in Deno KV
       │
       └─→ /v1/traces (POST)   ──→  Store spans + extract errors
                                      │
                                      ↓
                               ┌─────────────┐
                               │   Deno KV   │
                               └──────┬──────┘
                                      │
                               ┌──────↓──────┐
                               │ Lume Build  │
                               └──────┬──────┘
                                      │
                               ┌──────↓──────┐
                               │  Dashboard  │
                               └─────────────┘
```

## Usage

### 1. Build the Client

```bash
cd client
deno task lume
```

### 2. Start the Server

```bash
deno task dev
# or
deno run --allow-all serve.ts
```

### 3. Send Telemetry Data

The exporter (`otlp/exporter/mod.ts`) automatically sends:

- **Page view metrics** on `onPageLoad()`
- **Error traces** when errors occur

### 4. View Dashboard

Visit `http://localhost:8000/` to see:

- Service list with activity status
- Per-service dashboards with PV graphs
- Recent error lists

## Data Storage

### KV Key Patterns

```typescript
["services"]                              → Array<string>
["service", serviceName, "info"]          → ServiceInfo
["pv", serviceName, dateISO, path]        → PageViewCount
["spans", serviceName, timestamp, spanId] → SpanRecord (30-day TTL)
["errors", serviceName, errorHash]        → ErrorRecord
["errors_by_time", serviceName, timestamp]→ errorHash
```

### Retention

- **Metrics (PV)**: Permanent
- **Traces**: 30 days
- **Errors**: Last 50 unique errors per service

## Features

✅ Automatic service discovery
✅ Page view counting and visualization
✅ Error tracking with deduplication
✅ 30-day PV graph visualization
✅ Recent error list (10 errors)
✅ Dark/light theme support (daisyUI)
✅ Responsive design
✅ Static site generation for fast loading

## Next Steps

1. **Error Detail Page**: Implement full error backtrace display
2. **Time Range Selection**: Add date range picker for PV graphs
3. **Real-time Updates**: Consider adding WebSocket for live data
4. **Export Functionality**: Add CSV/JSON export for metrics
5. **Alert Configuration**: Set up error thresholds and notifications
6. **Performance Metrics**: Add P50/P95/P99 latency tracking
7. **Search/Filter**: Add error search and filtering capabilities
