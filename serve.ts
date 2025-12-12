import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { ALLOWED_DOMAINS } from "./types.ts";
import otlpRouter from "./otlp/collector/mod.ts";

const app = new Hono();

// CORS middleware for browser endpoints
// Note: For analytics tracking, we need to allow cross-origin requests
// from websites. We validate the domain via the URL path parameter.
// Origins are restricted to prevent abuse - only requests from pages
// belonging to allowed domains are accepted.
const corsMiddleware = cors({
  origin: (origin) => {
    // Allow requests from allowed domains or localhost for testing
    if (!origin) return "*"; // Allow direct requests (e.g., curl, Postman)

    try {
      const url = new URL(origin);
      // Check if the origin's hostname matches or is a subdomain of allowed domains
      const isAllowed = ALLOWED_DOMAINS.some((domain) =>
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );

      // Also allow localhost for development
      if (
        isAllowed || url.hostname === "localhost" ||
        url.hostname === "127.0.0.1"
      ) {
        return origin;
      }
    } catch {
      // Invalid origin URL
    }

    return "";
  },
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["Content-Type"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
  credentials: false,
});

// Health check endpoint
app.get("/", (c) => {
  return c.json({ status: "ok", service: "bunseki" });
});

// Mount OTLP router
app.use("/v1", corsMiddleware);
app.route("/", otlpRouter);

let clientTsPromise: Promise<string> | null = null;
app.get("/client.ts", async (c) => {
  if (!clientTsPromise) {
    clientTsPromise = Deno.readTextFile(
      new URL("./otlp/exporter/mod.ts", import.meta.url),
    );
  }
  return c.body(await clientTsPromise, {
    headers: { "Content-Type": "application/typescript" },
  });
});

let clientBundlePromise: Promise<Deno.bundle.Result> | null = null;
app.get("/client.js", async (c) => {
  if (!clientBundlePromise) {
    const entrypoints = [
      new URL("./otlp/exporter/mod.ts", import.meta.url).toString(),
    ];
    clientBundlePromise = Deno.bundle({
      entrypoints,
      write: false,
      sourcemap: "inline",
    });
  }
  const ret = await clientBundlePromise;
  if (ret.errors.length > 0) {
    console.error("Error bundling client.ts:", ret.errors);
    return c.body("Internal Server Error", { status: 500 });
  }
  return c.body(ret.outputFiles![0].text(), {
    headers: { "Content-Type": "application/javascript" },
  });
});

export default {
  fetch: app.fetch,
};
