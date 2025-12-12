import { Hono } from "@hono/hono";
import { sValidator } from "@hono/standard-validator";
import {
  type LogsRequest,
  logsRequestSchema,
  type MetricsRequest,
  metricsRequestSchema,
  type TracesRequest,
  tracesRequestSchema,
} from "./types.ts";

const router = new Hono()
  .post(
    // OTLP/HTTP Traces Endpoint
    "/traces",
    sValidator("json", tracesRequestSchema),
    (c) => {
      try {
        const body = c.req.valid("json") as TracesRequest;

        // TODO: Process and store trace data
        console.log(`Received ${body.resourceSpans.length} resource spans`);

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
    (c) => {
      try {
        const body = c.req.valid("json") as MetricsRequest;

        // TODO: Process and store metric data
        console.log(`Received ${body.resourceMetrics.length} resource metrics`);

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
        const body = c.req.valid("json") as LogsRequest;

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
