import type { Context, Next } from "hono";
import { verifySignature } from "./auth.ts";
import type { AllowedDomain } from "./types.ts";

// Middleware to verify HMAC signature for server endpoints
// This middleware reads the body, verifies signature, parses JSON, and stores it in context
export const signatureMiddleware = async (c: Context, next: Next) => {
  const domain = c.req.param("domain") as AllowedDomain;
  const signature = c.req.header("x-signature");
  
  if (!signature) {
    return c.json({ error: "Missing signature" }, 401);
  }
  
  // Read the body text
  const body = await c.req.text();
  
  // Verify signature
  const isValid = await verifySignature(domain, body, signature);
  
  if (!isValid) {
    return c.json({ error: "Invalid signature" }, 401);
  }
  
  // Parse and store the JSON for use in validation and handler
  try {
    const parsedBody = JSON.parse(body);
    c.set("parsedBody", parsedBody);
  } catch (error) {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  
  await next();
};
