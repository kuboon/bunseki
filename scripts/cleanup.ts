import { ALLOWED_DOMAINS } from "../types.ts";
import { aggregateAndCleanup } from "../storage.ts";

console.log("Running data cleanup and aggregation...");

for (const domain of ALLOWED_DOMAINS) {
  console.log(`Processing domain: ${domain}`);
  await aggregateAndCleanup(domain);
  console.log(`Completed: ${domain}`);
}

console.log("Cleanup completed successfully!");

Deno.exit(0);
