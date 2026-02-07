import { join } from "@std/path";
import { existsSync } from "@std/fs";

// Simulate the resolvePathWithParams function
async function testPathResolution() {
  const root = "./client/_site";

  console.log("Testing path resolutions:\n");

  // Test 1: Root path
  console.log("1. Testing '/' -> should find index.html");
  const path1 = join(root, "index.html");
  console.log("   Looking for:", path1);
  console.log("   Exists:", existsSync(path1));

  // Test 2: Direct file
  console.log("\n2. Testing '/exporter.browser.js'");
  const path2 = join(root, "exporter.browser.js");
  console.log("   Looking for:", path2);
  console.log("   Exists:", existsSync(path2));

  // Test 3: Check dashboard structure
  console.log("\n3. Checking dashboard structure:");
  try {
    console.log("   Contents of ./client/_site/dashboard:");
    for await (const entry of Deno.readDir("./client/_site/dashboard")) {
      console.log("   -", entry.name, entry.isDirectory ? "(dir)" : "(file)");

      if (entry.isDirectory && entry.name.startsWith(":")) {
        console.log(`     Contents of ${entry.name}:`);
        try {
          for await (
            const subEntry of Deno.readDir(
              `./client/_site/dashboard/${entry.name}`,
            )
          ) {
            console.log(
              "     -",
              subEntry.name,
              subEntry.isDirectory ? "(dir)" : "(file)",
            );
          }
        } catch (e) {
          console.log(`     Error: ${e.message}`);
        }
      }
    }
  } catch (e) {
    console.log("   Error:", e.message);
  }

  // Test 4: Try to resolve dynamic path
  console.log("\n4. Testing dynamic path resolution:");
  console.log("   Request: /dashboard/o.kbn.one/index.js");
  console.log("   Should find: ./client/_site/dashboard/:serviceName/index.js");

  // Check if :serviceName directory exists
  const paramDirs = [];
  try {
    for await (const entry of Deno.readDir("./client/_site/dashboard")) {
      if (entry.isDirectory && entry.name.startsWith(":")) {
        paramDirs.push(entry.name);
        const targetFile = join(
          "./client/_site/dashboard",
          entry.name,
          "index.js",
        );
        console.log(`   Checking: ${targetFile}`);
        console.log(`   Exists: ${existsSync(targetFile)}`);
      }
    }
  } catch (e) {
    console.log("   Error:", e.message);
  }

  if (paramDirs.length === 0) {
    console.log("   WARNING: No :param directories found in dashboard/");
  }
}

testPathResolution();
