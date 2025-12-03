import type { Context, Next } from "hono";
import { verifySignature } from "./auth.ts";
import type { AllowedDomain } from "./types.ts";

// Middleware to verify HMAC signature for server endpoints
export const signatureMiddleware = async (c: Context, next: Next) => {
  const domain = c.req.param("domain") as AllowedDomain;
  const signature = c.req.header("x-signature");
  
  if (!signature) {
    return c.json({ error: "Missing signature" }, 401);
  }
  
  // Clone the request to read the body without consuming it
  const clonedReq = c.req.raw.clone();
  const body = await clonedReq.text();
  
  const isValid = await verifySignature(domain, body, signature);
  
  if (!isValid) {
    return c.json({ error: "Invalid signature" }, 401);
  }
  
  await next();
};
