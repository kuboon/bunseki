import dashboardApiRouter from "./api/dashboard.ts";
// import kvAdminRouter from "@kuboon/kvAdmin";
import { ALLOWED_DOMAINS } from "../types.ts";
import { createOtlpStorageAdapter, initStorage } from "./storage/mod.ts";
import { rewriteRequestPath, STATIC_ROOT } from "./utils/serveDynamicStatic.ts";
import { createCollectorRouter } from "../otlp/collector/router.ts";

import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { serveStatic } from "@hono/hono/deno";

// Initialize storage on startup
await initStorage();

// Create OTLP collector router with KV storage adapter
const otlpRouter = createCollectorRouter(createOtlpStorageAdapter());

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
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
  credentials: false,
});

app.use("/exporter.browser.js", corsMiddleware);
app.use("/otlp/*", corsMiddleware);
app.use("/api/*", corsMiddleware);

// Mount routers
app.route("/otlp", otlpRouter);
app.route("/", dashboardApiRouter);
// app.route("/api/kvadmin", kvAdminRouter);

// Serve static files from Lume build output with dynamic parameter resolution
// This automatically resolves paths like /dashboard/:serviceName/index.js
app.get(
  "*",
  serveStatic({
    root: STATIC_ROOT,
    rewriteRequestPath,
  }),
);

export default {
  fetch: app.fetch.bind(app),
};
