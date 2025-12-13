#!/usr/bin/env -S deno run --allow-net --allow-env --unstable-kv

// Script to generate test data for the analytics view
// Usage: deno run --allow-net --allow-env --unstable-kv scripts/generate-test-data.ts

import {
  saveBrowserEvent,
  saveDailyStats,
  saveErrorEvent,
  saveServerEvent,
} from "../storage.ts";
import type { AllowedDomain } from "../types.ts";

const DOMAIN: AllowedDomain = "o.kbn.one";

console.log("Generating test data for domain:", DOMAIN);

// Generate browser events
console.log("Creating browser events...");
for (let i = 0; i < 20; i++) {
  const timestamp = Date.now() - (i * 1000 * 60 * 30); // Every 30 minutes
  await saveBrowserEvent({
    domain: DOMAIN,
    timestamp,
    url: `https://${DOMAIN}/page-${i % 5}`,
    referrer: i % 3 === 0 ? "https://google.com" : undefined,
    userAgent: "Mozilla/5.0 (Test)",
    screenResolution: "1920x1080",
    language: "en-US",
    sessionId: `session-${i % 8}`,
  });
}

// Generate server events
console.log("Creating server events...");
for (let i = 0; i < 15; i++) {
  const timestamp = Date.now() - (i * 1000 * 60 * 45); // Every 45 minutes
  await saveServerEvent({
    domain: DOMAIN,
    timestamp,
    endpoint: `/api/endpoint-${i % 3}`,
    method: ["GET", "POST", "PUT"][i % 3],
    statusCode: i % 5 === 0 ? 500 : 200,
    duration: Math.floor(Math.random() * 500) + 50,
    userAgent: "API Client/1.0",
    ip: "127.0.0.1",
  });
}

// Generate error events
console.log("Creating error events...");
for (let i = 0; i < 5; i++) {
  const timestamp = Date.now() - (i * 1000 * 60 * 120); // Every 2 hours
  await saveErrorEvent({
    domain: DOMAIN,
    timestamp,
    message: `Test error ${i}: Something went wrong`,
    stack: `Error: Test error ${i}\n    at test.ts:${i * 10}`,
    url: `https://${DOMAIN}/page-${i}`,
    userAgent: "Mozilla/5.0 (Test)",
    type: i % 2 === 0 ? "browser" : "server",
  });
}

// Generate daily stats
console.log("Creating daily stats...");
const today = new Date();
for (let i = 0; i < 7; i++) {
  const date = new Date(today);
  date.setDate(date.getDate() - i);
  const dateStr = date.toISOString().split("T")[0];

  await saveDailyStats({
    domain: DOMAIN,
    date: dateStr,
    pageViews: Math.floor(Math.random() * 500) + 100,
    uniqueSessions: Math.floor(Math.random() * 100) + 20,
    errors: Math.floor(Math.random() * 10),
    serverRequests: Math.floor(Math.random() * 1000) + 200,
    avgDuration: Math.floor(Math.random() * 300) + 50,
  });
}

console.log("✅ Test data generated successfully!");
console.log(`Visit: http://localhost:8000/domains/${DOMAIN}/view/`);
