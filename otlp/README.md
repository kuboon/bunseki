# OTLP http/json lightweight partial implementation

## Usage

### collector

```ts
import {
  createCollectorRouter,
  type OtlpStorage,
} from "jsr:@kuboon/otlp/collector.ts";

const storage: OtlpStorage = {
  async storeSpan(serviceName, span) {
    console.log("span", serviceName, span.name);
  },
  async storeEvent(serviceName, _span, event) {
    console.log("event", serviceName, event.name);
  },
  async incrementCounter(
    serviceName,
    counterName,
    keyName,
    _timestamp,
    count = 1,
  ) {
    console.log("metric", serviceName, counterName, keyName, count);
  },
};

const app = createCollectorRouter(storage);
// POST /v1/traces, /v1/metrics
Deno.serve((req) => app.fetch(req));
```

### exporter/browser

```html
<html>
  <head>
    <script>
      const e = [], p = e.push.bind(e);
      addEventListener("error", p, true);
      addEventListener("unhandledrejection", p);
      addEventListener("DOMContentLoaded", () => {
        removeEventListener("error", p, true);
        removeEventListener("unhandledrejection", p);
        for (const err of e) dispatchEvent(err);
      });
    </script>
    <script
      type="module"
      crossorigin="anonymous"
      src="https://esm.sh/jsr/@kuboon/otlp/exporter/browser"
    >
    </script>
  </head>
  <body>
    <script type="module">
      const apiRes = await fetch("/api/do_something", {
        method: "POST",
        headers: {
          traceparent: span.traceparent,
        },
      });

      // or use span.fetch
      // - adds traceparent header
      // - capture fetch error and report
      const apiRes = await span.fetch("/api/do_something", {
        method: "POST",
      });
    </script>
  </body>
</html>
```

### exporter/server

```ts
import { OtlpExporter } from "jsr:@kuboon/otlp/exporter/server.ts";

const otlp = new OtlpExporter({
  serviceName: "your-app",
  endpoint: "https://your-collector.example.com",
});

Deno.serve((req) =>
  otlp.middleware(req, async () => {
    if (new URL(req.url).pathname === "/health") {
      return new Response("ok");
    }

    return new Response("hello");
  }, (res) => res.status < 500)
);
```

# OTLP specs

http/json is based on ProtoJson https://protobuf.dev/programming-guides/json/

- [trace.proto](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/trace/v1/trace.proto)
- [metrics.proto](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/metrics/v1/metrics.proto)
- [logs.proto](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/logs/v1/logs.proto)
