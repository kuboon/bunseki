// index.test.ts
import { createCollectorRouter } from "../collector/router.ts";
import { InMemoryStorage } from "../collector/storage/memory.ts";
import { OtlpExporter } from "./server.ts";

import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";

const storage = new InMemoryStorage();
const collector = createCollectorRouter(storage);

const exporter = new OtlpExporter({
  serviceName: "test-service",
  endpoint: "http://localhost:4318",
  // deno-lint-ignore require-await
  fetch: async (req: RequestInfo | URL, init?: RequestInit) =>
    collector.fetch(new Request(req, init)),
});

describe("onRequest", () => {
  it("generates http_request span", async () => {
    const req = new Request("http://localhost/test", {
      method: "GET",
      headers: {
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      },
    });
    const span = exporter.onRequest(req);
    const result = await span.postError(new Error("Test error"));
    if (!result.ok) throw result.error;
    expect(span.name).toBe("HTTP GET");
    // console.log(JSON.stringify(span.trace, null, 2));
  });
});
