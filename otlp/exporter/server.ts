import { SpanKind } from "./types.ts";
import { sendRedirectMetric } from "./core/metrics.ts";
import { OtlpExporterBase, Span } from "./core/mod.ts";

export class OtlpExporter extends OtlpExporterBase {
  onRequest(req: Request, route?: string): Span {
    const spanKind = SpanKind.SERVER;
    const traceparent = req.headers.get("traceparent");
    let [, traceId, parentSpanId, flags]: (string | undefined)[] =
      traceparent?.split("-") || [];
    if (flags !== "01") {
      traceId = undefined;
      parentSpanId = undefined;
    }
    const trace = this.newTrace({ traceId, spanKind });
    const span = trace.newSpan({
      name: ["HTTP", req.method, route].filter(Boolean).join(" "),
      parentSpanId,
    });
    span.addAttribute("http.request.method", req.method);
    if (route) {
      span.addAttribute("http.route", route);
    }
    span.addAttribute("url.full", req.url);
    return span;
  }

  /// for Server
  async onRedirect(
    oldPath: string,
    newPath: string,
    route?: string,
    statusCode: number = 301,
  ): Promise<void> {
    await sendRedirectMetric(this, oldPath, newPath, route, statusCode);
  }
  async middleware(
    req: Request,
    next: () => Promise<Response>,
    postIf: (res: Response) => boolean = () => false,
  ): Promise<Response> {
    const span = this.onRequest(req);
    try {
      const res = await next();
      if (res.ok && res.status >= 300 && res.status < 400) {
        const location = res.headers.get("Location");
        if (location) {
          await this.onRedirect(
            req.url,
            location,
            undefined,
            res.status,
          );
          return res;
        }
      }
      if (postIf(res)) {
        span.addAttribute("http.response.status_code", res.status);
        await span.post();
      }
      return res;
    } catch (e) {
      if (e instanceof Error) {
        await span.postError(e);
      } else if (typeof e === "string") {
        await span.postError(new Error(e));
      } else {
        span.addEvent({
          name: "Unknown error",
          attr: { error: JSON.stringify(e) },
        });
        await span.postError(new Error("Unknown error"));
      }
      throw e;
    }
  }
}
