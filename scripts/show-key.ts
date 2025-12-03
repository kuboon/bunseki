import { ALLOWED_DOMAINS } from "../types.ts";
import { getOrCreateSigningKey } from "../storage.ts";

console.log("Bunseki Signing Keys");
console.log("===================\n");

for (const domain of ALLOWED_DOMAINS) {
  const key = await getOrCreateSigningKey(domain);
  console.log(`Domain: ${domain}`);
  console.log(`Key: ${key}`);
  console.log("");
  console.log("To sign a request, use HMAC-SHA256:");
  console.log(`const signature = await generateHMAC(key, requestBody);`);
  console.log(`Add header: x-signature: <signature>`);
  console.log("\n---\n");
}

Deno.exit(0);
