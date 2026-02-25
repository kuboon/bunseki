import {
  SpanEventType,
  SpanKind,
  SpanType,
  tracesRequestSchema,
} from "../../schemas.ts";
import {
  AttributePrimitive,
  bytesToHex,
  toAttributes,
  toUnixNano,
} from "../../protojson.ts";
import { dateNow, ExporterConfig } from "../utils.ts";

const randomBytes = (length: number) =>
  crypto.getRandomValues(new Uint8Array(length));
const generateTraceId = () => bytesToHex(randomBytes(16));
const generateSpanId = () => bytesToHex(randomBytes(8));
const unixNanoString = (now = dateNow()) => toUnixNano(now);
const isPromise = (obj: unknown): obj is Promise<unknown> =>
  typeof obj === "object" && obj !== null && "finally" in obj &&
  typeof obj.finally === "function";

export type TraceOpts = {
  traceId?: string;
  spanKind?: number;
};

export class TraceObj {
  readonly traceId: string;
  readonly parentSpanId?: string;
  readonly spanKind: number;
  spans: SpanObj[] = [];

  constructor(
    private exporter: ExporterConfig,
    opts: TraceOpts = {},
  ) {
    this.traceId = opts.traceId || generateTraceId();
    this.spanKind = opts.spanKind || SpanKind.INTERNAL;
  }
  newSpan(opts: SpanOpts): SpanObj {
    const span = new SpanObj(this, opts);
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
            attributes: toAttributes({
              "service.name": this.exporter.serviceName,
            }),
          },
          scopeSpans: [
            {
              scope: this.exporter.scope,
              spans,
            },
          ],
        },
      ],
    } satisfies typeof tracesRequestSchema.infer;
  }
  async post() {
    try {
      const ret = await this.exporter.client.v1.traces.$post({
        json: this.toJSON(),
      });
      for (const span of this.spans) span.posted = true;
      return { ok: true as const, response: ret };
    } catch (error) {
      console.error("Failed to post trace data:", error);
      return { ok: false as const, error: error as Error };
    }
  }
}

type SpanOpts = {
  name: string;
  parentSpanId?: string;
};

class SpanObj {
  readonly name: string;
  readonly startAt = dateNow();
  endAt: number | null = null;
  readonly spanId = generateSpanId();
  readonly parentSpanId?: string;
  readonly attributes: Record<string, AttributePrimitive> = {};
  readonly events: SpanEventType[] = [];
  status?: { code: number; message?: string };
  posted = false;
  constructor(public trace: TraceObj, opts: SpanOpts) {
    this.name = opts.name;
    this.parentSpanId = opts.parentSpanId;
  }
  end() {
    this.endAt ||= dateNow();
  }
  get traceparent() {
    return `00-${this.trace.traceId}-${this.spanId}-01`;
  }
  child(name: string): SpanObj {
    return this.trace.newSpan({ name, parentSpanId: this.spanId });
  }
  inSpan<T>(
    name: string,
    fn: (span: SpanObj) => T | Promise<T>,
  ): T | Promise<T> {
    const span = this.child(name);
    const ret = fn(span);
    if (isPromise(ret)) {
      return ret.finally(() => span.end()) as Promise<T>;
    }
    span.end();
    return ret;
  }
  addAttribute(key: string, value: AttributePrimitive) {
    this.attributes[key] = value;
  }
  addEvent(
    { name, attr = {} }: {
      name: string;
      attr?: Record<string, AttributePrimitive>;
    },
  ) {
    const event: SpanEventType = {
      name,
      timeUnixNano: unixNanoString(),
      attributes: toAttributes(attr),
    };
    this.events.push(event);
  }
  addErrorEvent(error: Error, { escaped = false } = {}) {
    const stacktrace = error.stack?.split("\n").map((s) => s.trim()) || [];
    this.addEvent({
      name: "exception",
      attr: {
        "exception.type": error.name,
        "exception.message": error.message,
        "exception.stacktrace": stacktrace,
        "exception.escaped": escaped,
      },
    });
  }
  toJSON() {
    this.endAt ||= dateNow();
    const attributes = toAttributes(this.attributes);
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
    // endAt will be filled in `toJSON`
    return await this.trace.post();
  }
  async postError(error: Error) {
    this.addErrorEvent(error);
    return await this.post();
  }
  // no need to do `.bind(span)`
  get fetch() {
    return (input: RequestInfo, init: RequestInit = {}) => {
      const method = init.method || "GET";
      const reqUrl = new URL(
        typeof input === "string" ? input : input.url,
      );
      return this.inSpan(`HTTP ${method} ${reqUrl.pathname}`, (span) => {
        span.addAttribute("server.address", reqUrl.hostname);
        span.addAttribute("server.port", reqUrl.port || "80");
        span.addAttribute("http.request.method", method);
        span.addAttribute("url.full", reqUrl.href);
        span.addAttribute("url.path", reqUrl.pathname);
        const headers = new Headers(init.headers);
        headers.set("traceparent", this.traceparent);
        init.headers = headers;
        const start = performance.now();
        return fetch(input, init).then((response) => {
          span.addAttribute("http.response.status_code", response.status);
          span.addAttribute(
            "http.duration_ms",
            performance.now() - start,
          );
          return response;
        }).catch((error) => {
          span.postError(error).then(() => {
            throw error;
          });
        });
      });
    };
  }
}
export type { SpanObj };
