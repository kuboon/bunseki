import otlpRouter from "./otlp/collector/mod.ts";
import { ALLOWED_DOMAINS } from "./types.ts";
import { initStorage } from "./storage/mod.ts";

import { Hono } from "@hono/hono";
import { serveStatic } from "@hono/hono/deno";
import { cors } from "@hono/hono/cors";

// Initialize storage on startup
await initStorage();

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

app.use("/client.*", corsMiddleware);
app.use("/otlp/*", corsMiddleware);
// Mount OTLP router
app.route("/otlp", otlpRouter);

// Serve static files from Lume build output
app.get("*", serveStatic({ root: "./client/_site" }));

export default {
  fetch: app.fetch,
};
