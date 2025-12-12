import {
  attrValue,
  bytesToHex,
  spanAttr,
  SpanEventType,
  SpanKind,
  SpanType,
} from "../schemas.ts";
import type { AppType } from "../collector/mod.ts";

import { hc } from "@hono/hono/client";

export class OtlpExporter {
  readonly scope = { name: "honotlp", version: "1.0.0" };
  client: ReturnType<typeof hc<AppType>>;
  constructor(
    public serviceName: string,
    private endpoint: string = globalThis.location.origin,
  ) {
    this.client = hc<AppType>(this.endpoint);
  }
  newTrace(opts: TraceOpts = {}): Trace {
    return new Trace(this, opts);
  }
  onPageLoad(location = new URL(globalThis.location.href)) {
    const spanKind = SpanKind.CLIENT;
    const trace = this.newTrace({ spanKind });
    const span = trace.newSpan({ name: "page_load" });
    span.addAttribute("url.full", location.href);
    span.addAttribute("url.path", location.pathname);
    span.addAttribute("http.method", "GET");
    return span;
  }
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
}

const randomBytes = (length: number) =>
  crypto.getRandomValues(new Uint8Array(length));
const generateTraceId = () => bytesToHex(randomBytes(16));

type TraceOpts = {
  traceId?: string;
  spanKind?: number;
};
class Trace {
  readonly traceId: string;
  readonly parentSpanId?: string;
  readonly spanKind: number;
  spans: Span[] = [];

  constructor(
    private exporter: OtlpExporter,
    opts: TraceOpts = {},
  ) {
    this.traceId = opts.traceId || generateTraceId();
    this.spanKind = opts.spanKind || SpanKind.INTERNAL;
  }
  newSpan(opts: SpanOpts): Span {
    const span = new Span(this, opts);
    this.spans.push(span);
    return span;
  }
  toJSON() {
    const spans = this.spans.filter((span) => !span.posted).map((span) =>
      span.toJSON()
    );
    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              spanAttr("service.name", this.exporter.serviceName),
            ],
          },
          scopeSpans: [
            {
              scope: this.exporter.scope,
              spans,
            },
          ],
        },
      ],
    } satisfies Parameters<
      typeof this.exporter.client.v1.traces.$post
    >[0]["json"];
  }
  async post() {
    const ret = await this.exporter.client.v1.traces.$post({
      json: this.toJSON(),
    });
    for (const span of this.spans) span.posted = true;
    return ret;
  }
}

const generateSpanId = () => bytesToHex(randomBytes(8));
const unixNanoString = (now = Date.now()) => String(BigInt(now) * BigInt(1e6));
const isPromise = (obj: unknown): obj is Promise<unknown> =>
  typeof obj === "object" && obj !== null && "finally" in obj &&
  typeof obj.finally === "function";

type SpanOpts = {
  name: string;
  parentSpanId?: string;
};
class Span {
  readonly name: string;
  readonly startAt = Date.now();
  endAt: number | null = null;
  readonly spanId = generateSpanId();
  readonly parentSpanId?: string;
  readonly attributes: Record<string, ReturnType<typeof attrValue>> = {};
  readonly events: SpanEventType[] = [];
  status?: { code: number; message?: string };
  posted = false;
  constructor(public trace: Trace, opts: SpanOpts) {
    this.name = opts.name;
    this.parentSpanId = opts.parentSpanId;
  }
  end() {
    this.endAt = Date.now();
  }
  get traceparent() {
    return `00-${this.trace.traceId}-${this.spanId}-01`;
  }
  child(name: string): Span {
    return this.trace.newSpan({ name, parentSpanId: this.spanId });
  }
  inSpan<T>(name: string, fn: (span: Span) => T | Promise<T>): T | Promise<T> {
    const span = this.child(name);
    const ret = fn(span);
    if (isPromise(ret)) {
      return ret.finally(() => span.end()) as Promise<T>;
    }
    span.end();
    return ret;
  }
  addAttribute(key: string, value: Parameters<typeof attrValue>[0]) {
    this.attributes[key] = attrValue(value);
  }
  addErrorEvent(error: Error, { escaped = false } = {}) {
    const stacktrace = error.stack?.split("\n").map((s) => s.trim()) || [];
    const event: SpanEventType = {
      name: "exception",
      timeUnixNano: unixNanoString(),
      attributes: [
        spanAttr("exception.type", error.name),
        spanAttr("exception.message", error.message),
        spanAttr("exception.stacktrace", stacktrace),
        spanAttr("exception.escaped", escaped),
      ],
    };
    this.events.push(event);
  }
  toJSON() {
    const attributes = Object.entries(this.attributes).map(([key, value]) => ({
      key,
      value,
    }));
    this.endAt = this.endAt || Date.now();
    return {
      traceId: this.trace.traceId,
      kind: this.trace.spanKind,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      name: this.name,
      startTimeUnixNano: unixNanoString(this.startAt),
      endTimeUnixNano: unixNanoString(this.endAt),
      attributes,
      events: this.events,
    } satisfies SpanType;
  }
  async post() {
    return await this.trace.post();
  }
  async postError(error: Error) {
    this.addErrorEvent(error);
    return await this.post();
  }
}
