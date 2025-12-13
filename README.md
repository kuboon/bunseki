# bunseki

Simple OTLP collector on deno deploy &amp; deno KV

## Features

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

## API Endpoints

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
