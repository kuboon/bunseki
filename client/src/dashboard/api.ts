import type { DashboardApiType } from "#server/dashboard";
import { hc, InferResponseType } from "@hono/hono/client";

export const dashboardApi = hc<DashboardApiType>("/").api.dashboard;
export type { InferResponseType };
