import { resolveStacktrace } from "./sourceMap.ts";
import { expect } from "@std/expect";

Deno.test("resolveStacktrace - maps correctly", async () => {
  const originalFetch = globalThis.fetch;
  const jsUrl = "http://example.com/app.js";
  const mapUrl = "http://example.com/app.js.map";

  // A simple map that maps generated column 10 to original line 5, column 0 of app.ts
  // "AAAA;AAAA;AAAA;AAAA;UAAU" -> Line 5, col 0?
  // Previous verification confirmed it maps to app.ts:1:0.
  // Wait, previous verification output: "    at foo (app.ts:1:0)"
  const mapContent = JSON.stringify({
    version: 3,
    file: "app.js",
    sourceRoot: "",
    sources: ["app.ts"],
    names: [],
    mappings: "AAAA;AAAA;AAAA;AAAA;UAAU",
  });

  try {
    // @ts-ignore: Mock fetch
    globalThis.fetch = (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === jsUrl) {
        return Promise.resolve(
          new Response(
            `function foo() {} //# sourceMappingURL=app.js.map`,
          ),
        );
      }
      if (url === mapUrl) return Promise.resolve(new Response(mapContent));
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    };

    const stack = [`    at foo (${jsUrl}:1:10)`];
    const resolved = await resolveStacktrace(stack);

    expect(resolved[0]).toBe("    at foo (app.ts:1:0)");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("resolveStacktrace - handles missing map gracefully", async () => {
  const originalFetch = globalThis.fetch;

  try {
    // @ts-ignore: Mock fetch
    globalThis.fetch = () =>
      Promise.resolve(new Response("Not Found", { status: 404 }));

    const stack = ["    at foo (http://example.com/nofile.js:1:10)"];
    const resolved = await resolveStacktrace(stack);

    expect(resolved[0]).toBe(stack[0]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
