import { SpanKind } from "./types.ts";
import { sendRedirectMetric } from "./core/metrics.ts";
import { OtlpExporter as OtlpExporterBase, Span } from "./core/mod.ts";

type MiddlewareOpts = {
  postIf?: (res: Response) => boolean;
};
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
    opts: MiddlewareOpts = {},
  ): Promise<Response> {
    const postIf = opts.postIf || ((res: Response) => !res.ok);
    const span = this.onRequest(req);
    try {
      const res = span.addTraceparentToResponse(await next());
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("Location");
        if (location) {
          await this.onRedirect(
            req.url,
            location,
            undefined, // todo route info is not available here, maybe we can add it to `onRedirect` params later
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
