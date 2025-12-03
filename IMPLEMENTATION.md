# Bunseki Implementation Summary

## Project Structure

```
bunseki/
├── .devcontainer/
│   └── devcontainer.json      # Deno development container configuration
├── examples/
│   ├── browser-client.js      # Browser tracking implementation example
│   └── server-client.ts       # Server middleware example for Deno/Hono
├── scripts/
│   ├── cleanup.ts             # Data aggregation and cleanup script
│   └── show-key.ts            # Display signing keys for domains
├── auth.ts                    # HMAC-SHA256 signature verification
├── main.ts                    # Main Hono.js server application
├── storage.ts                 # Deno KV storage operations
├── types.ts                   # TypeScript type definitions
├── deno.json                  # Deno configuration and tasks
├── .gitignore                 # Git ignore rules
└── README.md                  # Documentation
```

## Key Features Implemented

### 1. Devcontainer Setup
- Uses official Deno Docker image
- Pre-configured VS Code settings for Deno
- Automatic extension installation

### 2. Analytics Endpoints

#### Browser Endpoints (CORS-enabled)
- `POST /domains/:domain/browser` - Page view tracking
- `POST /domains/:domain/browser/error` - Error reporting

**Features:**
- CORS support with origin validation (allowed domains + subdomains)
- Tracks: URL, referrer, user agent, screen resolution, language, session ID
- No authentication required (public endpoints)
- Input validation for required fields

#### Server Endpoints (Signature-authenticated)
- `POST /domains/:domain/server` - Server request tracking
- `POST /domains/:domain/server/error` - Server error reporting

**Features:**
- HMAC-SHA256 signature authentication via `x-signature` header
- Tracks: endpoint, method, status code, duration, user agent, IP
- Input validation for required fields

### 3. Domain Configuration
- Hardcoded whitelist: `o.kbn.one` and `dd2030.org`
- Type-safe domain handling with TypeScript
- Easy to extend by updating `ALLOWED_DOMAINS` in `types.ts`

### 4. Data Storage (Deno KV)

**Key Structure:**
- `["events", "browser", domain, timestamp]` → BrowserEvent
- `["events", "server", domain, timestamp]` → ServerEvent
- `["events", "error", domain, timestamp]` → ErrorEvent
- `["sessions", domain, date, sessionId]` → true (permanent)
- `["stats", "daily", domain, date]` → DailyStats
- `["keys", domain]` → signing key

**Session Tracking:**
- Permanent session storage for accurate unique session counts
- Sessions tracked per date for proper aggregation
- Survives data cleanup operations

### 5. Data Retention Policy

**Strategy:**
- Raw events: kept for 30 days
- After 30 days: aggregated into daily statistics
- Raw events deleted after aggregation
- Daily stats preserved indefinitely
- Sessions stored permanently for accurate counts

**Aggregation includes:**
- Page views count
- Unique sessions (from permanent session store)
- Error count
- Server request count
- Average response duration

**Run cleanup:**
```bash
deno task cleanup
```

### 6. Authentication System

**Key Generation:**
- Automatic generation on first access
- 256-bit random keys (64 hex characters)
- Stored in Deno KV
- One key per domain

**Signature Algorithm:**
- HMAC-SHA256
- Key: hex string decoded to bytes
- Message: request body JSON string
- Header: `x-signature: <hex_signature>`

**View keys:**
```bash
deno task show-key
```

### 7. Security Features

- Input validation on all endpoints
- Domain whitelist enforcement
- CORS origin validation (domain + subdomains)
- Signature-based authentication for server endpoints
- Hex key properly decoded for HMAC operations
- Type-safe TypeScript throughout

## Usage Examples

### Browser Tracking
```html
<script src="/path/to/browser-client.js"></script>
```

Tracks page views and errors automatically.

### Server Tracking (Hono Middleware)
```typescript
import { analyticsMiddleware } from "./examples/server-client.ts";

app.use(analyticsMiddleware());
```

### Manual Event Tracking
```typescript
// Browser
window.bunseki.track();
window.bunseki.error({ message: "Error", stack: "..." });

// Server
await trackServerRequest(endpoint, method, statusCode, duration);
await trackServerError(message, stack, url, userAgent);
```

## Running the Server

```bash
# Development with auto-reload
deno task dev

# Production
deno task start

# Show signing keys
deno task show-key

# Run cleanup (aggregate old data)
deno task cleanup
```

## Environment Variables

- `PORT`: Server port (default: 8000)

## Dependencies

- **Hono**: v4.0.0 - Fast web framework
- **Deno**: Runtime environment
- **Deno KV**: Built-in key-value storage

## Testing

The implementation has been thoroughly reviewed with:
- Code review for logic and best practices
- CodeQL security scanning (0 vulnerabilities)
- Input validation on all endpoints
- Proper error handling throughout

## Future Enhancements

Possible future improvements:
- Dashboard UI for viewing statistics
- Query API for retrieving analytics data
- Webhook notifications for errors
- Rate limiting on endpoints
- Additional event types (custom events, conversions, etc.)
- Export functionality for data
- Automatic scheduled cleanup (cron job)
