# View Implementation Guide

This document explains the analytics dashboard implementation and how it addresses the requirements.

## Requirements Addressed

1. ✅ View-related files are in `view/` directory
2. ✅ Files served using Hono's `serveStatic` middleware
3. ✅ View data fetched via API instead of embedded in HTML
4. ✅ Routes grouped under `domains/:domain` with Hono route grouping
5. ✅ Domain validation moved to middleware
6. ✅ Using `deno bundle` CLI command instead of programmatic bundling

## Architecture

### Directory Structure

```
view/
├── README.md           # Documentation
├── index.html          # Dashboard HTML (static)
├── client.ts           # TypeScript source (to be bundled)
└── client.bundle.js    # Bundled JavaScript (generated, gitignored)
```

### Route Structure

All domain-specific routes are grouped under `/domains/:domain`:

```
GET  /domains/:domain/api/data          # API endpoint for analytics data
GET  /domains/:domain/view/*            # Static files served by serveStatic
POST /domains/:domain/browser           # Browser event tracking
POST /domains/:domain/browser/error     # Browser error reporting
POST /domains/:domain/server            # Server event tracking
POST /domains/:domain/server/error      # Server error reporting
```

### Middleware

**Domain Validation Middleware**: Checks if the domain parameter is in the `ALLOWED_DOMAINS` list and stores the validated domain in the context. This eliminates repetitive domain validation in each route handler.

```typescript
const domainMiddleware = async (c: any, next: any) => {
  const domain = c.req.param("domain");
  
  if (!ALLOWED_DOMAINS.includes(domain as AllowedDomain)) {
    return c.json({ error: "Domain not allowed" }, 403);
  }
  
  c.set("domain", domain as AllowedDomain);
  await next();
};
```

### Data Flow

1. User accesses `/domains/o.kbn.one/view/`
2. Hono's `serveStatic` serves `view/index.html`
3. Browser loads `view/client.bundle.js`
4. JavaScript extracts domain from URL path
5. Fetches data from `/domains/o.kbn.one/api/data`
6. Renders charts and tables client-side

## Using Deno Bundle

### Why Deno Bundle?

As of Deno 2.4+, the `deno bundle` CLI command has been reintroduced and is the official, supported way to bundle code. It:

- Uses esbuild under the hood (fast and reliable)
- Provides automatic minification and tree-shaking
- Supports both server and browser targets
- Is officially maintained and guaranteed to work

### Build Process

The `scripts/build-client.ts` script uses `Deno.Command` to run the `deno bundle` CLI:

```typescript
const buildCommand = new Deno.Command("deno", {
  args: [
    "bundle",
    "--output", "view/client.bundle.js",
    "view/client.ts"
  ],
  stdout: "inherit",
  stderr: "inherit",
});
```

### Building

Run the build task:

```bash
deno task build-client
```

This generates `view/client.bundle.js` from `view/client.ts`.

## API Endpoint

### GET /domains/:domain/api/data

Returns analytics data in JSON format:

```json
{
  "browserEvents": [...],   // Recent 50 browser events
  "serverEvents": [...],    // Recent 50 server events
  "errorEvents": [...],     // Recent 50 error events
  "dailyStats": [...]       // Last 30 days of daily statistics
}
```

The endpoint uses `Promise.all()` to fetch all data concurrently for better performance.

## Testing

### Generate Test Data

```bash
deno task test-data
```

This creates sample browser events, server events, and errors for the last 30 days.

### Start Development Server

```bash
# Build client code first
deno task build-client

# Start server
deno task dev
```

### Access Dashboard

Open browser to:
```
http://localhost:8000/domains/o.kbn.one/view/
```

## Key Implementation Details

### Route Grouping

Using Hono's `basePath()` method to group routes:

```typescript
const domains = app.basePath("/domains/:domain");
domains.use("*", domainMiddleware);

// All routes automatically have /domains/:domain prefix
domains.post("/browser", ...);
domains.post("/server", ...);
domains.get("/api/data", ...);
domains.get("/view/*", serveStatic({ root: "./" }));
```

### Static File Serving

```typescript
domains.get("/view/*", serveStatic({ root: "./" }));
```

This serves files from the `view/` directory. When accessing `/domains/:domain/view/index.html`, Hono serves `./view/index.html`.

### Client-Side Domain Detection

The JavaScript client extracts the domain from the URL:

```typescript
function getDomain(): string {
  const path = window.location.pathname;
  const match = path.match(/\/domains\/([^\/]+)/);
  return match ? match[1] : "";
}
```

Then uses it to fetch data from the correct API endpoint.

## Benefits of This Approach

1. **Separation of Concerns**: Static files, API, and tracking endpoints are clearly separated
2. **Scalability**: API can be consumed by other clients (mobile apps, CLI tools)
3. **Performance**: Client-side rendering reduces server load
4. **Maintainability**: Using official `deno bundle` ensures long-term compatibility
5. **Clean Code**: Route grouping and middleware eliminate duplication
6. **Security**: Domain validation happens once in middleware

## Future Enhancements

- Add caching headers to static files
- Implement real-time updates with WebSocket
- Add authentication for dashboard access
- Create additional visualization types
- Export data functionality
