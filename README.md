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
# serve
deno task serve

# with watch
deno task dev
```

## OTLP Collector Endpoints

Endpoints are OTEL OTLP/HTTP compatible.
Endpoint base: `https://your.domain/otlp/`

- `POST /otlp/v1/traces`
- `POST /otlp/v1/metrics`

## OTLP Exporter

### On browser

```ts
import { OtlpExporter } from "https://jsr.io/@kuboon/otlp/exporter/browser.ts";

const otlp = new OtlpExporter({ serviceName: "o.kbn.one" });
let span = await otlp.onPageLoad();
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

// appends `traceparent` header, creats fetch span, post on error
await span.fetch("/api/on-server", {
  headers: { traceparent: span.traceparent },
});
```

### On server

```ts
import { OtlpExporter } from "https://jsr.io/@kuboon/otlp/exporter/server.ts";

const otlp = new OtlpExporter({ serviceName: "o.kbn.one" });

export default {
  fetch(request) {
    const span = otlp.onRequest(request);
    // do process
    await span.post();
    return new Response("hello");
  },
} satisfies Deno.ServeDefaultExport;
```

## License

MIT
