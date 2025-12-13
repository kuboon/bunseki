import { SpanKind } from "../schemas.ts";
import { Trace, TraceOpts } from "./trace.ts";
import { sendPVMetric, sendRedirectMetric } from "./metrics.ts";
import type { AppType } from "../collector/mod.ts";

import { hc } from "@hono/hono/client";

export { _setNow } from "./utils.ts";

type NewOptions = {
  serviceName: string;
  endpoint?: string;
};

export class OtlpExporter {
  readonly scope = { name: "honotlp", version: "1.0.0" };
  readonly serviceName: string;
  private readonly endpoint: string;
  client: ReturnType<typeof hc<AppType>>;
  constructor(options: NewOptions) {
    this.serviceName = options.serviceName;
    this.endpoint = options.endpoint ?? "https://bunseki.kbn.one/otlp";
    this.client = hc<AppType>(this.endpoint);
  }
  newTrace(opts: TraceOpts = {}): Trace {
    return new Trace(this, opts);
  }

  /// for Client
  onPageLoad(location = new URL(globalThis.location.href)) {
    const spanKind = SpanKind.CLIENT;
    const trace = this.newTrace({ spanKind });
    const span = trace.newSpan({ name: "page_load" });
    span.addAttribute("url.full", location.href);
    span.addAttribute("url.path", location.pathname);
    span.addAttribute("http.method", "GET");

    // Send PV count metric
    sendPVMetric(this, location.pathname);

    return span;
  }

  /// for Server
  onRequest(req: Request) {
    const spanKind = SpanKind.SERVER;
    const traceparent = req.headers.get("traceparent");
    let [, traceId, parentSpanId, flags]: (string | undefined)[] =
      traceparent?.split("-") || [];
    if (flags !== "01") {
      traceId = undefined;
      parentSpanId = undefined;
    }
    const trace = this.newTrace({ traceId, spanKind });
    const span = trace.newSpan({ name: "http_request", parentSpanId });
    span.addAttribute("http.method", req.method);
    span.addAttribute("url.full", req.url);
    return span;
  }

  /// for Server
  onRedirect(
    oldPath: string,
    newPath: string,
    route?: string,
    statusCode: number = 301,
  ) {
    sendRedirectMetric(this, oldPath, newPath, route, statusCode);
  }
}
