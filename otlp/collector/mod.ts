import {
  logsRequestSchema,
  metricsRequestSchema,
  tracesRequestSchema,
} from "../schemas.ts";

import { Hono } from "@hono/hono";
import { sValidator } from "@hono/standard-validator";
import { incrementCounter, storeError, storeSpan } from "../../storage/mod.ts";

// Helper to extract service name from resource attributes
function getServiceName(
  attributes: Array<{ key: string; value: { stringValue?: string } }>,
): string | null {
  const attr = attributes.find((a) => a.key === "service.name");
  return attr?.value?.stringValue || null;
}

// Helper to extract exception events from span
function extractExceptions(span: {
  events?: Array<{
    name: string;
    attributes?: Array<{
      key: string;
      value: {
        stringValue?: string;
        arrayValue?: { values: Array<{ stringValue?: string }> };
        boolValue?: boolean;
      };
    }>;
  }>;
}): Array<{ type: string; message: string; stacktrace: string[] }> {
  if (!span.events) return [];

  return span.events
    .filter((event) => event.name === "exception")
    .map((event) => {
      const attrs = event.attributes || [];
      const type = attrs.find((a) =>
        a.key === "exception.type"
      )?.value?.stringValue || "";
      const message =
        attrs.find((a) => a.key === "exception.message")?.value?.stringValue ||
        "";
      const stackAttr = attrs.find((a) => a.key === "exception.stacktrace");
      const stacktrace =
        stackAttr?.value?.arrayValue?.values.map((v) => v.stringValue || "") ||
        [];

      return { type, message, stacktrace };
    })
    .filter((exc) => exc.type && exc.message);
}

const router = new Hono().basePath("/v1")
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
              await storeSpan(serviceName, span);

              // Extract and store errors
              const exceptions = extractExceptions(span);
              for (const exception of exceptions) {
                await storeError(serviceName, span, exception);
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

                  await incrementCounter(
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
export type AppType = typeof router;
export default router;
