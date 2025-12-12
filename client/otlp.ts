import type { AppType } from "../main.ts";
import { hc } from "@hono/hono/client";
import { TracesRequest } from "../otlp/types.ts";

const stringAttribute = (key: string, value: string) => ({
  key,
  value: { stringValue: value },
});

const generateTraceId = () =>
  crypto.getRandomValues(new Uint8Array(16)).reduce((hex, byte) => hex + byte.toString(16).padStart(2, '0'), '');
const generateSpanId = () =>
  crypto.getRandomValues(new Uint8Array(8)).reduce((hex, byte) => hex + byte.toString(16).padStart(2, '0'), '');

export class OtlpExporter {
  client: ReturnType<typeof hc<AppType>>;
  traceId: string;
  spans: string[] = [];
  constructor(public serviceDomain: string, private location: string = globalThis.location.href) {
    this.client = hc<AppType>(this.location);
    this.traceId = generateTraceId();
  }
  newTrace() {
    this.traceId = generateTraceId();
  }
  span<T>(fn: () => T): T {
    this.spans.push(generateSpanId());
    const ret = fn();
    this.spans.pop();
    return ret;
  }
  postTrace(error: Error) {
    const postFn = this.client.v1.traces.$post;
    const postBody: TracesRequest = {
      resourceSpans: [
        {
          resource: {
            attributes: [
              stringAttribute("service.domain", this.serviceDomain),
            ],
          },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: this.traceId,
                  spanId: generateSpanId(),
                  name: "error",
                  startTimeUnixNano: String(BigInt(Date.now()) * BigInt(1e6)),
                  endTimeUnixNano: String(BigInt(Date.now() + 1000) * BigInt(1e6)),
                  attributes: [
                    stringAttribute("error.type", error.name),
                    stringAttribute("error.message", error.message),
                    stringAttribute("error.stack", error.stack || ""),
                  ],
                  status: {
                    code: 2,
                    message: error.message,
                  },
                },
              ],
              scope: {
                name: "example-scope",
                version: "1.0.0",
              },
            },
          ],
        },
      ],
    };
    return postFn({ json: postBody });
  }
}
