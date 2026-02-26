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

```html
<html>
  <head>
    <script type="module" crossorigin="anonymous" src="https://esm.sh/jsr/@kuboon/otlp/exporter/browser"></script>
  </head>
  <body>
    <script type="module">
      import { OtlpExporter } from "";

      const otlp = new OtlpExporter({
        serviceName: "your-app",
        endpoint: "https://your-collector.example.com/otlp",
      });

      const span = await otlp.onPageLoad();

      globalThis.addEventListener("error", (ev) => {
        if (ev.error instanceof Error) {
          await span.postError(ev.error);
        }
      });

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          await span.post();
        }
      });

      const apiRes = await fetch("/api/do_something", {
        method: "POST",
        headers: {
          traceparent: span.traceparent,
        },
      });

      // or use span.fetch
  </body>
</html>
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
