# bunseki

Simple OTLP/HTTP collector on deno deploy &amp; deno KV
And easy to use OTLP/HTTP exporter.

## Features

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
deno serve -A serve.ts
```

The server runs on port 8000 by default (configurable via `PORT` environment variable).

## OTLP Collector Endpoints

Endpoints are OTEL OTLP/HTTP compatible.
Endpoint base: `https://your.domain/otlp/`

- `POST /otlp/v1/traces`
- `POST /otlp/v1/metrics`

## OTLP Exporter

### On browser

```ts
import { OtlpExporter } from "https://bunseki.kbn.one/exporter.browser.js";

const otlp = new OtlpExporter({ serviceName: "o.kbn.one" });
let span = otlp.onPageLoad();
globalThis.addEventListener("error", (ev) => {
  span.postError(ev.error);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    span.post();
  } else {
    span = span.trace.newSpan({ name: "page-visible" });
  }
});
```

- CORS enabled for browser usage
- No authentication required

## License

MIT
