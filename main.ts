import { Hono } from "hono";
import { cors } from "hono/cors";
import { ALLOWED_DOMAINS, type AllowedDomain, type BrowserEvent, type ErrorEvent, type ServerEvent } from "./types.ts";
import { saveBrowserEvent, saveErrorEvent, saveServerEvent } from "./storage.ts";
import { verifySignature } from "./auth.ts";

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
app.post("/domains/:domain/browser", corsMiddleware, async (c) => {
  const domain = c.req.param("domain");
  
  if (!ALLOWED_DOMAINS.includes(domain as AllowedDomain)) {
    return c.json({ error: "Domain not allowed" }, 403);
  }
  
  try {
    const body = await c.req.json();
    
    // Validate required fields
    if (!body.url || typeof body.url !== "string") {
      return c.json({ error: "Missing or invalid 'url' field" }, 400);
    }
    
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
});

// Browser error reporting endpoint
app.post("/domains/:domain/browser/error", corsMiddleware, async (c) => {
  const domain = c.req.param("domain");
  
  if (!ALLOWED_DOMAINS.includes(domain as AllowedDomain)) {
    return c.json({ error: "Domain not allowed" }, 403);
  }
  
  try {
    const body = await c.req.json();
    
    // Validate required fields
    if (!body.message || typeof body.message !== "string") {
      return c.json({ error: "Missing or invalid 'message' field" }, 400);
    }
    
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
});

// Server analytics endpoint (with signature authentication)
app.post("/domains/:domain/server", async (c) => {
  const domain = c.req.param("domain");
  
  if (!ALLOWED_DOMAINS.includes(domain as AllowedDomain)) {
    return c.json({ error: "Domain not allowed" }, 403);
  }
  
  try {
    const signature = c.req.header("x-signature");
    if (!signature) {
      return c.json({ error: "Missing signature" }, 401);
    }
    
    const body = await c.req.text();
    const isValid = await verifySignature(domain as AllowedDomain, body, signature);
    
    if (!isValid) {
      return c.json({ error: "Invalid signature" }, 401);
    }
    
    const data = JSON.parse(body);
    
    // Validate required fields
    if (!data.endpoint || typeof data.endpoint !== "string") {
      return c.json({ error: "Missing or invalid 'endpoint' field" }, 400);
    }
    if (!data.method || typeof data.method !== "string") {
      return c.json({ error: "Missing or invalid 'method' field" }, 400);
    }
    if (typeof data.statusCode !== "number") {
      return c.json({ error: "Missing or invalid 'statusCode' field" }, 400);
    }
    if (typeof data.duration !== "number") {
      return c.json({ error: "Missing or invalid 'duration' field" }, 400);
    }
    
    const event: ServerEvent = {
      domain: domain as AllowedDomain,
      timestamp: Date.now(),
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      duration: data.duration,
      userAgent: data.userAgent,
      ip: data.ip,
    };
    
    await saveServerEvent(event);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving server event:", error);
    return c.json({ error: "Failed to save event" }, 500);
  }
});

// Server error reporting endpoint (with signature authentication)
app.post("/domains/:domain/server/error", async (c) => {
  const domain = c.req.param("domain");
  
  if (!ALLOWED_DOMAINS.includes(domain as AllowedDomain)) {
    return c.json({ error: "Domain not allowed" }, 403);
  }
  
  try {
    const signature = c.req.header("x-signature");
    if (!signature) {
      return c.json({ error: "Missing signature" }, 401);
    }
    
    const body = await c.req.text();
    const isValid = await verifySignature(domain as AllowedDomain, body, signature);
    
    if (!isValid) {
      return c.json({ error: "Invalid signature" }, 401);
    }
    
    const data = JSON.parse(body);
    
    // Validate required fields
    if (!data.message || typeof data.message !== "string") {
      return c.json({ error: "Missing or invalid 'message' field" }, 400);
    }
    
    const event: ErrorEvent = {
      domain: domain as AllowedDomain,
      timestamp: Date.now(),
      message: data.message,
      stack: data.stack,
      url: data.url,
      userAgent: data.userAgent,
      type: "server",
    };
    
    await saveErrorEvent(event);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving error event:", error);
    return c.json({ error: "Failed to save error" }, 500);
  }
});

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`Starting server on port ${port}`);

Deno.serve({ port }, app.fetch);
