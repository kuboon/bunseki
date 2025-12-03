// Deno server middleware example for Bunseki analytics
// Usage: Add this middleware to your Deno server application

import { generateSignature } from "../auth.ts";

const ANALYTICS_URL = "https://your-bunseki-server.com";
const DOMAIN = "o.kbn.one"; // or 'dd2030.org'
const SIGNING_KEY = "your-signing-key-here"; // Get from: deno task show-key

export async function trackServerRequest(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  userAgent?: string,
  ip?: string,
) {
  const data = {
    endpoint,
    method,
    statusCode,
    duration,
    userAgent,
    ip,
  };
  
  const body = JSON.stringify(data);
  const signature = await generateSignature(SIGNING_KEY, body);
  
  try {
    await fetch(`${ANALYTICS_URL}/domains/${DOMAIN}/server`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
      },
      body,
    });
  } catch (error) {
    console.error("Failed to track server request:", error);
  }
}

export async function trackServerError(
  message: string,
  stack?: string,
  url?: string,
  userAgent?: string,
) {
  const data = {
    message,
    stack,
    url,
    userAgent,
  };
  
  const body = JSON.stringify(data);
  const signature = await generateSignature(SIGNING_KEY, body);
  
  try {
    await fetch(`${ANALYTICS_URL}/domains/${DOMAIN}/server/error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
      },
      body,
    });
  } catch (error) {
    console.error("Failed to track server error:", error);
  }
}

// Example middleware for Hono
export function analyticsMiddleware() {
  return async (c: any, next: any) => {
    const start = Date.now();
    
    await next();
    
    const duration = Date.now() - start;
    
    // Fire and forget
    trackServerRequest(
      c.req.path,
      c.req.method,
      c.res.status,
      duration,
      c.req.header("user-agent"),
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
    );
  };
}
