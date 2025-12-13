// generateDummyData.ts
// Generate dummy telemetry data for a specified service

import { initStorage } from "../../storage/mod.ts";
import collector from "../collector/mod.ts";
import { _setNow, OtlpExporter } from "../exporter/mod.ts";
import { testClient } from "@hono/hono/testing";

await initStorage();

// Parse command line arguments
const serviceName = Deno.args[0] || "dummy-service";
const daysBack = parseInt(Deno.args[1] || "7");

console.log(`Generating dummy data for service: ${serviceName}`);
console.log(`Days back: ${daysBack}`);

// Create exporter with test client
const exporter = new OtlpExporter(serviceName, "http://localhost:4318");
exporter.client = testClient(collector);

// Common paths for page views
const paths = [
  "/",
  "/about",
  "/products",
  "/products/item-1",
  "/products/item-2",
  "/contact",
  "/blog",
  "/blog/post-1",
  "/blog/post-2",
  "/dashboard",
];

// Error types to simulate
const errorTypes = [
  { name: "TypeError", message: "Cannot read property 'x' of undefined" },
  { name: "ReferenceError", message: "foo is not defined" },
  { name: "NetworkError", message: "Failed to fetch" },
  { name: "ValidationError", message: "Invalid input data" },
];

// Generate data for each day
for (let day = daysBack - 1; day >= 0; day--) {
  const date = new Date();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);

  console.log(`\nGenerating data for ${date.toISOString().split("T")[0]}`);

  // Generate 10-50 page views per day
  const pvCount = Math.floor(Math.random() * 40) + 10;

  for (let i = 0; i < pvCount; i++) {
    // Random time during the day
    const timestamp = date.getTime() +
      Math.floor(Math.random() * 24 * 60 * 60 * 1000);
    _setNow(() => timestamp);

    // Random path
    const path = paths[Math.floor(Math.random() * paths.length)];
    const url = new URL(`http://example.com${path}`);

    const span = exporter.onPageLoad(url);

    // 10% chance of error
    if (Math.random() < 0.1) {
      const errorType =
        errorTypes[Math.floor(Math.random() * errorTypes.length)];
      const error = new Error(errorType.message);
      error.name = errorType.name;

      // Add realistic stack trace
      error.stack = `${errorType.name}: ${errorType.message}
    at ${path} (${url.href})
    at handleClick (script.js:123:15)
    at HTMLButtonElement.<anonymous> (script.js:456:7)`;

      await span.postError(error);
    } else {
      span.end();
      await span.post();
    }
  }

  // Generate some HTTP requests (API calls)
  const requestCount = Math.floor(Math.random() * 20) + 5;

  for (let i = 0; i < requestCount; i++) {
    const timestamp = date.getTime() +
      Math.floor(Math.random() * 24 * 60 * 60 * 1000);
    _setNow(() => timestamp);

    const methods = ["GET", "POST", "PUT", "DELETE"];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const apiPaths = [
      "/api/users",
      "/api/products",
      "/api/orders",
      "/api/auth",
    ];
    const path = apiPaths[Math.floor(Math.random() * apiPaths.length)];

    const req = new Request(`http://example.com${path}`, {
      method,
      headers: {
        "traceparent":
          "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      },
    });

    const span = exporter.onRequest(req);

    // 5% chance of error
    if (Math.random() < 0.05) {
      const errorType =
        errorTypes[Math.floor(Math.random() * errorTypes.length)];
      const error = new Error(errorType.message);
      error.name = errorType.name;

      error.stack = `${errorType.name}: ${errorType.message}
    at ${method} ${path} (api.js:78:12)
    at handleRequest (server.js:234:9)
    at processRequest (middleware.js:45:3)`;

      await span.postError(error);
    } else {
      span.end();
      await span.post();
    }
  }

  console.log(`  Generated ${pvCount} page views and ${requestCount} requests`);
}

// Reset now function
_setNow(() => Date.now());

console.log("\n✅ Dummy data generation complete!");
console.log(`\nTo view the data, start the server and visit:`);
console.log(`  http://localhost:3000/service/${serviceName}`);
