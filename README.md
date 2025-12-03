# bunseki
GA like tool for deno deploy &amp; deno KV

## Features

- **Browser Analytics**: Collect Google Analytics-like metrics from browsers
- **Server Analytics**: Track server-side metrics with signature-based authentication
- **Error Reporting**: Sentry-like error tracking for both browser and server
- **Data Retention**: Automatically aggregates data older than 1 month into daily statistics
- **Deno KV Storage**: All data stored in Deno KV
- **Domain-based**: Supports multiple domains with separate tracking

## Supported Domains

- `o.kbn.one`
- `dd2030.org`

## Setup

### Development Container

This project includes a devcontainer configuration for easy development with Deno.

### Running the Server

```bash
# Development mode with auto-reload
deno task dev

# Production mode
deno task start
```

The server runs on port 8000 by default (configurable via `PORT` environment variable).

### Build Client Bundle

Before starting the server, optionally build the client-side JavaScript bundle:

```bash
deno task build-client
```

This generates a bundled JavaScript file for the analytics view page. If not generated, the server will use the TypeScript source directly.

## API Endpoints

### Analytics View

**Endpoint**: `GET /domains/:domain/view/`

- Web-based analytics dashboard
- Displays graphs and tables of collected data
- Shows browser events, server events, errors, and daily statistics

### Browser Analytics

**Endpoint**: `POST /domains/:domain/browser`

- CORS enabled for browser usage
- No authentication required

**Request Body**:
```json
{
  "url": "https://example.com/page",
  "referrer": "https://google.com",
  "screenResolution": "1920x1080",
  "language": "en-US",
  "sessionId": "unique-session-id"
}
```

### Browser Error Reporting

**Endpoint**: `POST /domains/:domain/browser/error`

- CORS enabled
- No authentication required

**Request Body**:
```json
{
  "message": "Error message",
  "stack": "Error stack trace",
  "url": "https://example.com/page"
}
```

### Server Analytics

**Endpoint**: `POST /domains/:domain/server`

- Requires HMAC-SHA256 signature in `x-signature` header
- Signature should be computed over the request body

**Request Body**:
```json
{
  "endpoint": "/api/users",
  "method": "GET",
  "statusCode": 200,
  "duration": 123,
  "userAgent": "...",
  "ip": "1.2.3.4"
}
```

### Server Error Reporting

**Endpoint**: `POST /domains/:domain/server/error`

- Requires HMAC-SHA256 signature in `x-signature` header

**Request Body**:
```json
{
  "message": "Error message",
  "stack": "Error stack trace",
  "url": "/api/endpoint",
  "userAgent": "..."
}
```

## Authentication

Server endpoints require HMAC-SHA256 signatures. To get your signing key:

```bash
deno task show-key
```

This will display the signing keys for all configured domains. Keys are automatically generated on first run and stored in Deno KV.

## Testing

Generate test data for development:

```bash
deno task test-data
```

This will populate the database with sample browser events, server events, errors, and daily statistics. You can then view the analytics dashboard at `http://localhost:8000/domains/o.kbn.one/view/`.

## Data Retention

Run the cleanup task to aggregate old data:

```bash
deno task cleanup
```

This should be run periodically (e.g., via cron job) to:
- Aggregate raw events older than 1 month into daily statistics
- Delete old raw event data to save storage

## License

MIT
