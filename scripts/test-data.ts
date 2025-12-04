// Generate sample test data for development
import { saveBrowserEvent, saveServerEvent, saveErrorEvent } from "../storage.ts";
import type { AllowedDomain } from "../types.ts";

const domain: AllowedDomain = "o.kbn.one";

console.log("Generating test data...");

// Generate browser events
for (let i = 0; i < 30; i++) {
  const timestamp = Date.now() - i * 24 * 60 * 60 * 1000; // Last 30 days
  
  for (let j = 0; j < Math.floor(Math.random() * 50) + 10; j++) {
    await saveBrowserEvent({
      domain,
      timestamp: timestamp + j * 60000,
      url: `https://example.com/page${j % 5}`,
      referrer: j % 3 === 0 ? "https://google.com" : undefined,
      language: "en-US",
      screenResolution: "1920x1080",
      sessionId: `session-${Math.floor(j / 5)}`,
    });
  }
  
  // Generate some server events
  for (let j = 0; j < Math.floor(Math.random() * 20) + 5; j++) {
    await saveServerEvent({
      domain,
      timestamp: timestamp + j * 120000,
      endpoint: `/api/endpoint${j % 3}`,
      method: j % 2 === 0 ? "GET" : "POST",
      statusCode: j % 10 === 0 ? 500 : 200,
      duration: Math.floor(Math.random() * 200) + 50,
      userAgent: "Mozilla/5.0",
      ip: "127.0.0.1",
    });
  }
  
  // Generate some errors
  if (i % 3 === 0) {
    await saveErrorEvent({
      domain,
      timestamp: timestamp + 180000,
      message: `Test error ${i}`,
      stack: "Error stack trace...",
      url: "https://example.com/error",
      type: "browser",
    });
  }
}

console.log("Test data generated successfully!");
