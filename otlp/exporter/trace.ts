import {
  SpanEventType,
  SpanKind,
  SpanType,
  tracesRequestSchema,
} from "../schemas.ts";
import {
  bytesToHex,
  toAttributeValue as attrValue,
  toKeyValue as spanAttr,
  toUnixNano,
} from "../protojson.ts";
import { dateNow, ExporterConfig } from "./utils.ts";

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

export class Trace {
  readonly traceId: string;
  readonly parentSpanId?: string;
  readonly spanKind: number;
  spans: Span[] = [];

  constructor(
    private exporter: ExporterConfig,
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
    } satisfies typeof tracesRequestSchema.infer;
  }
  async post() {
    const ret = await this.exporter.client.v1.traces.$post({
      json: this.toJSON(),
    });
    for (const span of this.spans) span.posted = true;
    return ret;
  }
}

type SpanOpts = {
  name: string;
  parentSpanId?: string;
};

class Span {
  readonly name: string;
  readonly startAt = dateNow();
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
    this.endAt = dateNow();
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
    this.endAt = this.endAt || dateNow();
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
