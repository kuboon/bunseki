import { Hono } from "hono";
import { cors } from "hono/cors";
import { validator } from "hono/validator";
import { type } from "arktype";
import { ALLOWED_DOMAINS, type AllowedDomain, type BrowserEvent, type ErrorEvent, type ServerEvent } from "./types.ts";
import { saveBrowserEvent, saveErrorEvent, saveServerEvent, getRecentBrowserEvents, getRecentServerEvents, getRecentErrorEvents, getDailyStatsRange } from "./storage.ts";
import { signatureMiddleware } from "./middleware.ts";
import { browserEventSchema, browserErrorSchema, serverEventSchema, serverErrorSchema } from "./validation.ts";
import { bundleClientCode } from "./bundle.ts";

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

// Browser analytics endpoint
app.post(
  "/domains/:domain/browser",
  corsMiddleware,
  validator("json", (value, c) => {
    const parsed = browserEventSchema(value);
    if (parsed instanceof type.errors) {
      return c.json({ error: "Validation failed", details: parsed.summary }, 400);
    }
    return parsed;
  }),
  async (c) => {
    const domain = c.req.param("domain");
    
    if (!ALLOWED_DOMAINS.includes(domain as AllowedDomain)) {
      return c.json({ error: "Domain not allowed" }, 403);
    }
    
    try {
      const body = c.req.valid("json");
      
      const event: BrowserEvent = {
        domain: domain as AllowedDomain,
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
app.post(
  "/domains/:domain/browser/error",
  corsMiddleware,
  validator("json", (value, c) => {
    const parsed = browserErrorSchema(value);
    if (parsed instanceof type.errors) {
      return c.json({ error: "Validation failed", details: parsed.summary }, 400);
    }
    return parsed;
  }),
  async (c) => {
    const domain = c.req.param("domain");
    
    if (!ALLOWED_DOMAINS.includes(domain as AllowedDomain)) {
      return c.json({ error: "Domain not allowed" }, 403);
    }
    
    try {
      const body = c.req.valid("json");
      
      const event: ErrorEvent = {
        domain: domain as AllowedDomain,
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
app.post(
  "/domains/:domain/server",
  signatureMiddleware,
  async (c) => {
    const domain = c.req.param("domain");
    
    if (!ALLOWED_DOMAINS.includes(domain as AllowedDomain)) {
      return c.json({ error: "Domain not allowed" }, 403);
    }
    
    try {
      // Get parsed body from middleware context
      const data = c.get("parsedBody");
      
      // Validate with arktype
      const parsed = serverEventSchema(data);
      if (parsed instanceof type.errors) {
        return c.json({ error: "Validation failed", details: parsed.summary }, 400);
      }
      
      const event: ServerEvent = {
        domain: domain as AllowedDomain,
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
app.post(
  "/domains/:domain/server/error",
  signatureMiddleware,
  async (c) => {
    const domain = c.req.param("domain");
    
    if (!ALLOWED_DOMAINS.includes(domain as AllowedDomain)) {
      return c.json({ error: "Domain not allowed" }, 403);
    }
    
    try {
      // Get parsed body from middleware context
      const data = c.get("parsedBody");
      
      // Validate with arktype
      const parsed = serverErrorSchema(data);
      if (parsed instanceof type.errors) {
        return c.json({ error: "Validation failed", details: parsed.summary }, 400);
      }
      
      const event: ErrorEvent = {
        domain: domain as AllowedDomain,
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

// Analytics view endpoint
app.get("/domains/:domain/view/", async (c) => {
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
    
    const viewData = {
      domain,
      browserEvents,
      serverEvents,
      errorEvents,
      dailyStats,
    };
    
    // Read template
    const templatePath = new URL("./view-template.html", import.meta.url).pathname;
    let template = await Deno.readTextFile(templatePath);
    
    // Replace placeholders
    template = template.replace(/\{\{DOMAIN\}\}/g, domain);
    template = template.replace("{{VIEW_DATA}}", JSON.stringify(viewData));
    template = template.replace("{{BUNDLE_SCRIPT}}", `<script type="module">${bundledClientCode}</script>`);
    
    return c.html(template);
  } catch (error) {
    console.error("Error rendering view:", error);
    return c.json({ error: "Failed to render view" }, 500);
  }
});

// Bundle client code at startup
console.log("Bundling client code...");
const bundledClientCode = await bundleClientCode();
console.log("Client code bundled successfully");

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`Starting server on port ${port}`);

Deno.serve({ port }, app.fetch);
