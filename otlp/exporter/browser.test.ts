// index.test.ts
import collector from "../collector/mod.ts";
import { OtlpExporter } from "./browser.ts";
import { initStorage } from "../../storage/mod.ts";

import { testClient } from "@hono/hono/testing";
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";

const exporter = new OtlpExporter({
  serviceName: "test-service",
  endpoint: "http://localhost:4318",
});
exporter.client = testClient(collector);
await initStorage(":memory:");

describe("onPageLoad", () => {
  it("generates page_load span", async () => {
    const span = await exporter.onPageLoad(new URL("http://localhost/page"));
    await span.postError(new Error("Test error"));
    expect(span.name).toBe("page_load");
    // console.log(JSON.stringify(span.trace, null, 2));
  });
});
