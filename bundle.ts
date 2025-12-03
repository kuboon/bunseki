// Script to bundle the client code using Deno.bundle
// This is run at startup to create the bundled client code

const clientCodePath = new URL("./view-client.ts", import.meta.url).pathname;

export async function bundleClientCode(): Promise<string> {
  try {
    // Bundle the client code
    const { code } = await Deno.emit(clientCodePath, {
      bundle: "module",
      compilerOptions: {
        lib: ["dom", "dom.iterable", "esnext"],
        target: "es2020",
      },
    });

    return code;
  } catch (error) {
    console.error("Failed to bundle client code:", error);
    throw error;
  }
}
