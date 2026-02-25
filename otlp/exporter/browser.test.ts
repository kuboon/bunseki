// index.test.ts
import { createCollectorRouter } from "../collector/router.ts";
import { InMemoryStorage } from "../collector/storage/memory.ts";
import { OtlpExporter } from "./browser.ts";

import { testClient } from "@hono/hono/testing";
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";

const storage = new InMemoryStorage();
const collector = createCollectorRouter(storage);

const exporter = new OtlpExporter({
  serviceName: "test-service",
  endpoint: "http://localhost:4318",
});
exporter.client = testClient(collector);

describe("onPageLoad", () => {
  it("generates page_load span", async () => {
    const span = await exporter.onPageLoad(new URL("http://localhost/page"));
    await span.postError(new Error("Test error"));
    expect(span.name).toBe("page_load");
    // console.log(JSON.stringify(span.trace, null, 2));
  });
});
