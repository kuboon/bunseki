// Script to load the bundled client code
// The bundle should be pre-generated using: deno task build-client

const bundlePath = new URL("./view-client.bundle.js", import.meta.url).pathname;
const clientCodePath = new URL("./view-client.ts", import.meta.url).pathname;

export async function bundleClientCode(): Promise<string> {
  try {
    // Try to load pre-bundled code first
    try {
      const code = await Deno.readTextFile(bundlePath);
      console.log("Using pre-bundled client code");
      return code;
    } catch {
      // Bundle file doesn't exist, fall back to source
      console.warn("Bundle file not found, using source directly. Run 'deno task build-client' to generate bundle.");
      const code = await Deno.readTextFile(clientCodePath);
      return code;
    }
  } catch (error) {
    console.error("Failed to load client code:", error);
    throw error;
  }
}
