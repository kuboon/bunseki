import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { ALLOWED_DOMAINS } from "./types.ts";
import otlpRouter from "./otlp/router.ts";

const app = new Hono();

// CORS middleware for browser endpoints
// Note: For analytics tracking, we need to allow cross-origin requests
// from websites. We validate the domain via the URL path parameter.
// Origins are restricted to prevent abuse - only requests from pages
// belonging to allowed domains are accepted.
const _corsMiddleware = cors({
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
      if (isAllowed || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
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
const otlpApp = app.route("/v1", otlpRouter);

export type AppType = typeof otlpApp;

/**
 * API endpoint to fetch analytics data for a domain
 * Returns recent events and daily statistics in JSON format
 * 
 * @route GET /domains/:domain/api/data
 * @param domain - The domain to fetch data for (must be in ALLOWED_DOMAINS)
 * @returns JSON with browserEvents, serverEvents, errorEvents, and dailyStats
 * @throws 403 if domain is not allowed
 * @throws 500 if data fetching fails
 */
app.get("/domains/:domain/api/data", async (c) => {
  const domain = c.req.param("domain");
  
  if (!ALLOWED_DOMAINS.includes(domain as AllowedDomain)) {
    return c.json({ error: "Domain not allowed" }, 403);
  }
  
  try {
    // Fetch data from storage
    const [browserEvents, serverEvents, errorEvents, dailyStats] = await Promise.all([
      getRecentBrowserEvents(domain as AllowedDomain, 100),
      getRecentServerEvents(domain as AllowedDomain, 100),
      getRecentErrorEvents(domain as AllowedDomain, 100),
      getDailyStatsRange(domain as AllowedDomain, 30),
    ]);
    
    return c.json({
      domain,
      browserEvents,
      serverEvents,
      errorEvents,
      dailyStats,
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return c.json({ error: "Failed to fetch data" }, 500);
  }
});

// Serve static files for view page
app.use("/domains/:domain/view/*", serveStatic({ root: "./client" }));
app.get("/domains/:domain/view/", serveStatic({ path: "./client/index.html" }));

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`Starting server on port ${port}`);

Deno.serve({ port }, app.fetch);
