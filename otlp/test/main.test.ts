// index.test.ts
import { testClient } from "@hono/hono/testing";
import collector from "../collector/mod.ts";
import { OtlpExporter } from "../exporter/mod.ts";

import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";

const exporter = new OtlpExporter("test-service", "http://localhost:4318");
exporter.client = testClient(collector);

describe("onPageLoad", () => {
  it("generates page_load span", () => {
    const span = exporter.onPageLoad(new URL("http://localhost/page"));
    span.postError(new Error("Test error"));
    expect(span.name).toBe("page_load");
    console.log(JSON.stringify(span.trace, null, 2));
  });
});
describe("onRequest", () => {
  it("generates http_request span", () => {
    const req = new Request("http://localhost/test", {
      method: "GET",
      headers: {
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      },
    });
    const span = exporter.onRequest(req);
    span.postError(new Error("Test error"));
    expect(span.name).toBe("http_request");
    console.log(JSON.stringify(span.trace, null, 2));
  });
});
