import {
  logsRequestSchema,
  metricsRequestSchema,
  tracesRequestSchema,
} from "./schemas.ts";
import type { OtlpStorage } from "./storage/types.ts";

import { Hono } from "@hono/hono";
import { sValidator } from "@hono/standard-validator";

// Helper to extract service name from resource attributes
function getServiceName(
  attributes: Array<{ key: string; value: { stringValue?: string } }>,
): string | null {
  const attr = attributes.find((a) => a.key === "service.name");
  return attr?.value?.stringValue || null;
}

/**
 * Create OTLP collector router with the given storage implementation
 * @param storage Storage implementation for telemetry data
 * @returns Hono router for OTLP endpoints
 */
export function createCollectorRouter(storage: OtlpStorage) {
  return new Hono().basePath("/v1")
    .post(
      // OTLP/HTTP Traces Endpoint
      "/traces",
      sValidator("json", tracesRequestSchema),
      async (c) => {
        try {
          const body = c.req.valid("json");

          // Process and store trace data
          for (const resourceSpan of body.resourceSpans) {
            const serviceName = getServiceName(
              resourceSpan.resource?.attributes || [],
            );
            if (!serviceName) continue;

            for (const scopeSpan of resourceSpan.scopeSpans) {
              for (const span of scopeSpan.spans) {
                // Store the span
                await storage.storeSpan(serviceName, span);

                // Store span events
                for (const event of span.events || []) {
                  await storage.storeEvent(serviceName, span, event);
                }
              }
            }
          }
          return c.json({
            success: true,
            message: "Traces received",
          });
        } catch (error) {
          console.error("Error processing traces:", error);
          return c.json({ error: "Failed to process traces" }, 400);
        }
      },
    )
    .post(
      // OTLP/HTTP Metrics Endpoint
      "/metrics",
      sValidator("json", metricsRequestSchema),
      async (c) => {
        try {
          const body = c.req.valid("json");

          // Process and store metric data
          for (const resourceMetric of body.resourceMetrics) {
            const serviceName = getServiceName(
              resourceMetric.resource?.attributes || [],
            );
            if (!serviceName) continue;

            for (const scopeMetric of resourceMetric.scopeMetrics) {
              for (const metric of scopeMetric.metrics) {
                // Handle sum metrics (counters)
                if (metric.sum) {
                  for (const dataPoint of metric.sum.dataPoints) {
                    // Try to find a meaningful key from attributes
                    // Prioritize url.path, then location, then http.target
                    const keyAttr = dataPoint.attributes?.find(
                      (a) =>
                        a.key === "url.path" ||
                        a.key === "location" ||
                        a.key === "http.target",
                    );
                    const keyName = keyAttr?.value?.stringValue || "/";

                    const count = dataPoint.asInt
                      ? parseInt(dataPoint.asInt)
                      : dataPoint.asDouble
                      ? Math.round(dataPoint.asDouble)
                      : 1;

                    const timestamp = Math.floor(
                      parseInt(dataPoint.timeUnixNano) / 1_000_000,
                    );

                    await storage.incrementCounter(
                      serviceName,
                      metric.name,
                      keyName,
                      timestamp,
                      count,
                    );
                  }
                }
              }
            }
          }

          return c.json({
            success: true,
            message: "Metrics received",
          });
        } catch (error) {
          console.error("Error processing metrics:", error);
          return c.json({ error: "Failed to process metrics" }, 400);
        }
      },
    )
    .post(
      // OTLP/HTTP Logs Endpoint
      "/logs",
      sValidator("json", logsRequestSchema),
      (c) => {
        try {
          const body = c.req.valid("json");

          // TODO: Process and store log data
          console.log(`Received ${body.resourceLogs.length} resource logs`);

          return c.json({
            success: true,
            message: "Logs received",
          });
        } catch (error) {
          console.error("Error processing logs:", error);
          return c.json({ error: "Failed to process logs" }, 400);
        }
      },
    );
}
