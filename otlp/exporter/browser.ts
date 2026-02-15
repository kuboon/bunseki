import { SpanKind } from "../schemas.ts";
import { sendPVMetric } from "./core/metrics.ts";

import { OtlpExporterBase } from "./core/mod.ts";

export class OtlpExporter extends OtlpExporterBase {
  /// for Client
  async onPageLoad(location: URL | string = new URL(globalThis.location.href)) {
    if (typeof location === "string") {
      location = new URL(location);
    }
    const spanKind = SpanKind.CLIENT;
    const trace = this.newTrace({ spanKind });
    const span = trace.newSpan({ name: "page_load" });
    span.addAttribute("url.full", location.href);
    span.addAttribute("url.path", location.pathname);
    span.addAttribute("http.method", "GET");

    // Send PV count metric
    await sendPVMetric(this, location.pathname);

    return span;
  }
}
