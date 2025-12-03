#!/usr/bin/env -S deno run --allow-read --allow-write

// Build script to bundle the client code
// Run this script to generate the bundled JavaScript file
// Usage: deno run --allow-read --allow-write scripts/build-client.ts

import { bundle } from "https://deno.land/x/emit@0.31.0/mod.ts";

const clientCodePath = new URL("../view-client.ts", import.meta.url).pathname;
const outputPath = new URL("../view-client.bundle.js", import.meta.url).pathname;

console.log("Bundling client code...");

try {
  const result = await bundle(clientCodePath);
  
  // Write the bundled code
  await Deno.writeTextFile(outputPath, result.code);
  
  console.log(`✅ Client code bundled successfully to ${outputPath}`);
  console.log(`   Size: ${result.code.length} bytes`);
} catch (error) {
  console.error("❌ Failed to bundle client code:", error);
  Deno.exit(1);
}
