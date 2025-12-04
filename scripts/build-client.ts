// Build script using deno bundle CLI command
// This script uses the new deno bundle command instead of programmatic bundling

const buildCommand = new Deno.Command("deno", {
  args: [
    "bundle",
    "--output", "view/client.bundle.js",
    "view/client.ts"
  ],
  stdout: "inherit",
  stderr: "inherit",
});

console.log("Building client code with deno bundle...");
const { code } = await buildCommand.output();

if (code === 0) {
  console.log("✓ Client code bundled successfully to view/client.bundle.js");
} else {
  console.error("✗ Build failed with exit code:", code);
  Deno.exit(code);
}
