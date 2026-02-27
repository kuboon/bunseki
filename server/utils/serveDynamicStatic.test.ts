import { rewriteRequestPath, STATIC_ROOT } from "./serveDynamicStatic.ts";
import { Hono } from "@hono/hono";
import { serveStatic } from "@hono/hono/deno";
import { expect } from "@std/expect";

Deno.test("serveDynamicStatic - rewrite dynamic JS file path", () => {
  const rewritten = rewriteRequestPath("/dashboard/o.kbn.one/index.js");
  expect(rewritten).toBe("/dashboard/:serviceName/index.js");
});

Deno.test("serveDynamicStatic - serve index.html for /", async () => {
  const app = new Hono();
  app.get("*", serveStatic({ root: STATIC_ROOT, rewriteRequestPath }));

  const req = new Request("http://localhost/");
  const res = await app.fetch(req);
  await res.arrayBuffer();

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toContain("text/html");
});

Deno.test("serveDynamicStatic - serve static JS file", async () => {
  const app = new Hono();
  app.get("*", serveStatic({ root: STATIC_ROOT, rewriteRequestPath }));

  const req = new Request("http://localhost/index.js");
  const res = await app.fetch(req);
  await res.arrayBuffer();
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toContain("javascript");
});

Deno.test("serveDynamicStatic - serve dynamic JS file", async () => {
  const app = new Hono();
  app.get("*", serveStatic({ root: STATIC_ROOT, rewriteRequestPath }));

  // Test with actual dynamic path
  const req = new Request("http://localhost/dashboard/o.kbn.one/index.js");
  const res = await app.fetch(req);
  await res.arrayBuffer();

  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toContain("javascript");
});

Deno.test("serveDynamicStatic - serve dynamic HTML page", async () => {
  const app = new Hono();
  app.get("*", serveStatic({ root: STATIC_ROOT, rewriteRequestPath }));

  const req = new Request("http://localhost/dashboard/test-service/");
  const res = await app.fetch(req);
  await res.arrayBuffer();

  // This should find :serviceName/index.html
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toContain("text/html");
});
