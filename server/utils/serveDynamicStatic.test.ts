import { serveDynamicStatic } from "./serveDynamicStatic.ts";
import { Hono } from "@hono/hono";
import { expect } from "@std/expect";
import { existsSync } from "@std/fs";

// Helper to check file existence
console.log("\n=== Checking file structure ===");
console.log("index.html exists:", existsSync("./client/_site/index.html"));
console.log(
  "exporter.browser.js exists:",
  existsSync("./client/_site/exporter.browser.js"),
);

try {
  console.log("\nDashboard directory contents:");
  for await (const entry of Deno.readDir("./client/_site/dashboard")) {
    console.log(`  ${entry.isDirectory ? "📁" : "📄"} ${entry.name}`);
    if (entry.isDirectory && entry.name.startsWith(":")) {
      for await (
        const file of Deno.readDir(`./client/_site/dashboard/${entry.name}`)
      ) {
        console.log(`    ${file.isDirectory ? "📁" : "📄"} ${file.name}`);
      }
    }
  }
} catch (e) {
  console.log("  Error:", e instanceof Error ? e.message : String(e));
}

Deno.test("serveDynamicStatic - serve index.html for /", async () => {
  const app = new Hono();
  app.get("*", serveDynamicStatic({ root: "./client/_site" }));

  const req = new Request("http://localhost/");
  const res = await app.fetch(req);

  console.log("\n=== Test: GET / ===");
  console.log("Status:", res.status);
  console.log("Content-Type:", res.headers.get("Content-Type"));

  if (res.status === 200) {
    const text = await res.text();
    console.log("✓ Success - Body length:", text.length);
  } else {
    console.log("✗ Failed - Expected 200, got", res.status);
  }

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toContain("text/html");
});

Deno.test("serveDynamicStatic - serve static JS file", async () => {
  const app = new Hono();
  app.get("*", serveDynamicStatic({ root: "./client/_site" }));

  const req = new Request("http://localhost/exporter.browser.js");
  const res = await app.fetch(req);

  console.log("\n=== Test: GET /exporter.browser.js ===");
  console.log("Status:", res.status);
  console.log("Content-Type:", res.headers.get("Content-Type"));

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toContain("javascript");
});

Deno.test("serveDynamicStatic - serve dynamic JS file", async () => {
  const app = new Hono();
  app.get("*", serveDynamicStatic({ root: "./client/_site" }));

  // Test with actual dynamic path
  const req = new Request("http://localhost/dashboard/o.kbn.one/index.js");
  const res = await app.fetch(req);

  console.log("\n=== Test: GET /dashboard/o.kbn.one/index.js ===");
  console.log("Status:", res.status);
  console.log("Content-Type:", res.headers.get("Content-Type"));

  if (res.status !== 200) {
    console.log("✗ Failed - checking why...");

    // Debug: Check if :serviceName directory exists
    const exists = existsSync("./client/_site/dashboard/:serviceName");
    console.log("  :serviceName directory exists:", exists);

    if (exists) {
      const indexJsExists = existsSync(
        "./client/_site/dashboard/:serviceName/index.js",
      );
      console.log("  :serviceName/index.js exists:", indexJsExists);
    }
  } else {
    const arrayBuffer = await res.arrayBuffer();
    console.log("✓ Success - Body length:", arrayBuffer.byteLength);
  }

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toContain("javascript");
});

Deno.test("serveDynamicStatic - serve dynamic HTML page", async () => {
  const app = new Hono();
  app.get("*", serveDynamicStatic({ root: "./client/_site" }));

  const req = new Request("http://localhost/dashboard/test-service/");
  const res = await app.fetch(req);

  console.log("\n=== Test: GET /dashboard/test-service/ ===");
  console.log("Status:", res.status);
  console.log("Content-Type:", res.headers.get("Content-Type"));

  // This should find :serviceName/index.html
  if (res.status === 200) {
    console.log("✓ Success - served index.html from :serviceName directory");
  }
});
