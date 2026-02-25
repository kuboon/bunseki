# OTLP http/json lightweight partial implementation

## Usage

### collector

```ts
import { createCollectorRouter } from "jsr:@kuboon/otlp/collector.ts";
import type { OtlpStorage } from "jsr:@kuboon/otlp/storage.ts";

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
// POST /v1/traces, /v1/metrics, /v1/logs
Deno.serve((req) => app.fetch(req));
```

### exporter/browser

```ts
import { OtlpExporter } from "jsr:@kuboon/otlp/exporter/browser.ts";

const otlp = new OtlpExporter({
  serviceName: "your-app",
  endpoint: "https://your-collector.example.com",
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
// - adds traceparent header
// - capture fetch error and report
const apiRes = await span.fetch("/api/do_something", {
  method: "POST",
});
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
