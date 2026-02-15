import { SpanKind } from "../schemas.ts";
import { sendRedirectMetric } from "./core/metrics.ts";
import type { SpanObj } from "./core/trace.ts";

import { OtlpExporterBase } from "./core/mod.ts";

export class OtlpExporter extends OtlpExporterBase {
  onRequest(req: Request): SpanObj {
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
  async onRedirect(
    oldPath: string,
    newPath: string,
    route?: string,
    statusCode: number = 301,
  ) {
    await sendRedirectMetric(this, oldPath, newPath, route, statusCode);
  }
}
