import { Trace, TraceOpts } from "./trace.ts";
import type { IOtlpExporter } from "../types.ts";

export { _setNow } from "../utils.ts";

export type ExporterConfig = {
  serviceName: string;
  endpoint?: string;
  fetch?: typeof globalThis.fetch;
};

export class OtlpExporter implements IOtlpExporter {
  readonly scope = { name: "@kuboon/otlp", version: "1.0.0" };
  readonly serviceName: string;
  readonly fetch: (path: string, body: unknown) => Promise<Response>;
  constructor(options: ExporterConfig) {
    this.serviceName = options.serviceName;
    const endpoint = options.endpoint ?? "/otlp";
    const fetch_ = options.fetch ?? globalThis.fetch;
    this.fetch = (path: string, body: unknown) =>
      fetch_(endpoint + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
  }
  newTrace(opts: TraceOpts = {}): Trace {
    return new Trace(this, opts);
  }
}
export type { Span, Trace } from "./trace.ts";
