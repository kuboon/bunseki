import { type } from "arktype";
import { Hono } from "@hono/hono";
import { sValidator } from "@hono/standard-validator";
import {
  getDashboardData,
  getError,
  initStorage,
} from "../storage/mod.ts";

// Initialize storage
await initStorage();

// Validation schemas
const serviceNameParamSchema = type({
  serviceName: "string>0",
});

const errorParamSchema = type({
  serviceName: "string>0",
  errorHash: "string>0",
});

const router = new Hono().basePath("/api/dashboard")
  .get(
    "/:serviceName",
    sValidator("param", serviceNameParamSchema),
    async (c) => {
      try {
        const { serviceName } = c.req.valid("param");

        // Get dashboard data for all services (30 days)
        const dashboardData = await getDashboardData(30);

        // Find the specific service dashboard
        const dashboard = dashboardData.serviceDashboards.get(serviceName);

        if (!dashboard) {
          return c.json({ error: "Service not found" }, 404);
        }

        // Convert Map to plain object for JSON serialization
        const response = {
          service: dashboard.service,
          pvData: Array.from(dashboard.pvData.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date)),
          recentErrors: dashboard.recentErrors,
        };

        return c.json(response);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return c.json({ error: "Failed to fetch dashboard data" }, 500);
      }
    },
  )
  .get(
    "/:serviceName/error/:errorHash",
    sValidator("param", errorParamSchema),
    async (c) => {
      try {
        const { serviceName, errorHash } = c.req.valid("param");

        // Get the specific error
        const error = await getError(serviceName, errorHash);

        if (!error) {
          return c.json({ error: "Error not found" }, 404);
        }

        return c.json(error);
      } catch (error) {
        console.error("Error fetching error details:", error);
        return c.json({ error: "Failed to fetch error details" }, 500);
      }
    },
  );

export type DashboardApiType = typeof router;
export default router;
