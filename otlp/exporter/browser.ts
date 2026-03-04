import { sendPVMetric } from "./core/metrics.ts";
import { OtlpExporter, Trace } from "./core/mod.ts";
import { parseTraceparent } from "./utils.ts";

// get traceparent from "Server-Timing" header if available
function getTraceparent(): {
  traceId: string | undefined;
  parentSpanId: string | undefined;
} {
  const noParent = { traceId: undefined, parentSpanId: undefined };
  if (typeof globalThis === "undefined") return noParent;
  for (const entry of globalThis.performance.getEntriesByType("navigation")) {
    if (!("serverTiming" in entry)) continue;
    const serverTiming = entry.serverTiming as {
      name: string;
      description: string;
    }[];
    const traceparentEntry = serverTiming.find((e) => e.name === "traceparent");
    if (!traceparentEntry) continue;
    return parseTraceparent(traceparentEntry.description);
  }
  return noParent;
}

const { traceId, parentSpanId } = getTraceparent();
const exporter = new OtlpExporter({ serviceName: location.hostname });
const trace = exporter.newTrace({
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
function handleError(ev: ErrorEvent | PromiseRejectionEvent) {
  const error = ev instanceof ErrorEvent
    ? ev.error
    : ev instanceof PromiseRejectionEvent
    ? ev.reason
    : new Error(String(ev));
  span.postError(error);
}
function setupErrorListeners() {
  // Capture errors that occur during page load
  addEventListener("error", handleError, true);
  addEventListener("unhandledrejection", handleError);
}
if (document.readyState === "complete") {
  // DOMContentLoaded has already fired
  setupErrorListeners();
} else {
  document.addEventListener("DOMContentLoaded", setupErrorListeners);
}

export { span };
