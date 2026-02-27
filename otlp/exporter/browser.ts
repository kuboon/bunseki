import { sendPVMetric } from "./core/metrics.ts";
import { OtlpExporter } from "./core/mod.ts";

// get traceparent from "Server-Timing" header if available
function getTraceparent(): {
  traceId: string | undefined;
  parentSpanId: string | undefined;
} {
  const nullValue = { traceId: undefined, parentSpanId: undefined };
  if (typeof globalThis === "undefined") return nullValue;
  for (const entry of globalThis.performance.getEntriesByType("navigation")) {
    if (!("serverTiming" in entry)) continue;
    const serverTiming = entry.serverTiming as {
      name: string;
      description: string;
    }[];
    const traceparentEntry = serverTiming.find((e) => e.name === "traceparent");
    if (!traceparentEntry) continue;
    const traceparent = traceparentEntry.description;
    const [, traceId, parentSpanId, flags] = traceparent.split("-");
    if (flags == "01") return { traceId, parentSpanId };
    return nullValue;
  }
  return nullValue;
}

const { traceId, parentSpanId } = getTraceparent();
const exporter = new OtlpExporter({ serviceName: location.hostname });
let trace = exporter.newTrace({
  traceId,
  spanKind: 3, // SpanKind.CLIENT
});
const span = trace.newSpan({ name: "page_load", parentSpanId });
span.addAttribute("url.full", location.href);
span.addAttribute("url.path", location.pathname);
document.addEventListener("DOMContentLoaded", async () => {
  if (parentSpanId) await span.post();
  await sendPVMetric(exporter, location.pathname);
});
function handleError(ev: unknown) {
  const error = ev instanceof Error ? ev : new Error(String(ev));
  span.postError(error);
}
globalThis.addEventListener("error", handleError, true);
globalThis.addEventListener("unhandledrejection", handleError);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) trace = exporter.newTrace();
});
// deno-lint-ignore no-explicit-any
(globalThis as any).otlpTrace = trace;
