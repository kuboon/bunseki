import { getSigningKey } from "./storage.ts";
import type { AllowedDomain } from "./types.ts";

// Verify HMAC signature for server endpoints
export async function verifySignature(
  domain: AllowedDomain,
  body: string,
  signature: string,
): Promise<boolean> {
  const key = await getSigningKey(domain);
  if (!key) {
    return false;
  }

  const encoder = new TextEncoder();
  // Decode hex key to bytes for proper HMAC
  const keyData = hexToBytes(key);
  const messageData = encoder.encode(body);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  const signatureData = hexToBytes(signature);
  return await crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    signatureData,
    messageData,
  );
}

export async function generateSignature(
  key: string,
  body: string,
): Promise<string> {
  const encoder = new TextEncoder();
  // Decode hex key to bytes for proper HMAC
  const keyData = hexToBytes(key);
  const messageData = encoder.encode(body);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageData,
  );

  return bytesToHex(new Uint8Array(signatureBuffer));
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
