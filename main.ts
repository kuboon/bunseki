import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/deno";
import { validator } from "hono/validator";
import { type } from "arktype";
import { ALLOWED_DOMAINS, type AllowedDomain, type BrowserEvent, type ErrorEvent, type ServerEvent } from "./types.ts";
import { 
  saveBrowserEvent, 
  saveErrorEvent, 
  saveServerEvent,
  getRecentBrowserEvents,
  getRecentServerEvents,
  getRecentErrorEvents,
  getDailyStatsRange,
} from "./storage.ts";
import { signatureMiddleware } from "./middleware.ts";
import { browserEventSchema, browserErrorSchema, serverEventSchema, serverErrorSchema } from "./validation.ts";

const app = new Hono();

// Domain validation middleware
const domainMiddleware = async (c: any, next: any) => {
  const domain = c.req.param("domain");
  
  if (!ALLOWED_DOMAINS.includes(domain as AllowedDomain)) {
    return c.json({ error: "Domain not allowed" }, 403);
  }
  
  // Store validated domain in context
  c.set("domain", domain as AllowedDomain);
  await next();
};

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
      if (isAllowed || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return origin;
      }
    } catch {
      // Invalid origin URL
    }
    
    return false;
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

// Group routes under /domains/:domain with domain validation
const domains = app.basePath("/domains/:domain");
domains.use("*", domainMiddleware);

// Browser analytics endpoint
domains.post(
  "/browser",
  corsMiddleware,
  validator("json", (value, c) => {
    const parsed = browserEventSchema(value);
    if (parsed instanceof type.errors) {
      return c.json({ error: "Validation failed", details: parsed.summary }, 400);
    }
    return parsed;
  }),
  async (c) => {
    const domain = c.get("domain") as AllowedDomain;
    
    try {
      const body = c.req.valid("json");
      
      const event: BrowserEvent = {
        domain,
        timestamp: Date.now(),
        url: body.url,
        referrer: body.referrer,
        userAgent: c.req.header("user-agent"),
        screenResolution: body.screenResolution,
        language: body.language,
        sessionId: body.sessionId,
      };
      
      await saveBrowserEvent(event);
      
      return c.json({ success: true });
    } catch (error) {
      console.error("Error saving browser event:", error);
      return c.json({ error: "Failed to save event" }, 500);
    }
  }
);

// Browser error reporting endpoint
domains.post(
  "/browser/error",
  corsMiddleware,
  validator("json", (value, c) => {
    const parsed = browserErrorSchema(value);
    if (parsed instanceof type.errors) {
      return c.json({ error: "Validation failed", details: parsed.summary }, 400);
    }
    return parsed;
  }),
  async (c) => {
    const domain = c.get("domain") as AllowedDomain;
    
    try {
      const body = c.req.valid("json");
      
      const event: ErrorEvent = {
        domain,
        timestamp: Date.now(),
        message: body.message,
        stack: body.stack,
        url: body.url,
        userAgent: c.req.header("user-agent"),
        type: "browser",
      };
      
      await saveErrorEvent(event);
      
      return c.json({ success: true });
    } catch (error) {
      console.error("Error saving error event:", error);
      return c.json({ error: "Failed to save error" }, 500);
    }
  }
);

// Server analytics endpoint (with signature authentication)
domains.post(
  "/server",
  signatureMiddleware,
  async (c) => {
    const domain = c.get("domain") as AllowedDomain;
    
    try {
      // Get parsed body from middleware context
      const data = c.get("parsedBody");
      
      // Validate with arktype
      const parsed = serverEventSchema(data);
      if (parsed instanceof type.errors) {
        return c.json({ error: "Validation failed", details: parsed.summary }, 400);
      }
      
      const event: ServerEvent = {
        domain,
        timestamp: Date.now(),
        endpoint: parsed.endpoint,
        method: parsed.method,
        statusCode: parsed.statusCode,
        duration: parsed.duration,
        userAgent: parsed.userAgent,
        ip: parsed.ip,
      };
      
      await saveServerEvent(event);
      
      return c.json({ success: true });
    } catch (error) {
      console.error("Error saving server event:", error);
      return c.json({ error: "Failed to save event" }, 500);
    }
  }
);

// Server error reporting endpoint (with signature authentication)
domains.post(
  "/server/error",
  signatureMiddleware,
  async (c) => {
    const domain = c.get("domain") as AllowedDomain;
    
    try {
      // Get parsed body from middleware context
      const data = c.get("parsedBody");
      
      // Validate with arktype
      const parsed = serverErrorSchema(data);
      if (parsed instanceof type.errors) {
        return c.json({ error: "Validation failed", details: parsed.summary }, 400);
      }
      
      const event: ErrorEvent = {
        domain,
        timestamp: Date.now(),
        message: parsed.message,
        stack: parsed.stack,
        url: parsed.url,
        userAgent: parsed.userAgent,
        type: "server",
      };
      
      await saveErrorEvent(event);
      
      return c.json({ success: true });
    } catch (error) {
      console.error("Error saving error event:", error);
      return c.json({ error: "Failed to save error" }, 500);
    }
  }
);

// API endpoint to fetch analytics data
domains.get("/api/data", async (c) => {
  const domain = c.get("domain") as AllowedDomain;
  
  try {
    const [browserEvents, serverEvents, errorEvents, dailyStats] = await Promise.all([
      getRecentBrowserEvents(domain),
      getRecentServerEvents(domain),
      getRecentErrorEvents(domain),
      getDailyStatsRange(domain, 30),
    ]);
    
    return c.json({
      browserEvents,
      serverEvents,
      errorEvents,
      dailyStats,
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return c.json({ error: "Failed to fetch analytics data" }, 500);
  }
});

// Serve static files from view directory
domains.get("/view/*", serveStatic({ root: "./" }));

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`Starting server on port ${port}`);

Deno.serve({ port }, app.fetch);
