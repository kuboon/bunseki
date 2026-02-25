import { Trace, TraceOpts } from "./trace.ts";
import type { AppType } from "../../collector/mod.ts";

import { hc } from "@hono/hono/client";

export { _setNow } from "../utils.ts";

type NewOptions = {
  serviceName: string;
  endpoint?: string;
};

export class OtlpExporterBase {
  readonly scope = { name: "@kuboon/otlp", version: "1.0.0" };
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
}
export type { Span, Trace } from "./trace.ts";
