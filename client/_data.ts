// Lume data file - provides data to static pages during build
import type { ErrorRecord } from "../storage/mod.ts";
import { getDashboardData, initStorage } from "../storage/mod.ts";

// Initialize storage on load
await initStorage();

export const layout = "layout.tsx";

// Get dashboard data for all services
const dashboardData = await getDashboardData(30);

export const services = dashboardData.services;

// Convert Maps to plain objects/arrays for Lume serialization
export const serviceDashboards: Record<string, {
  service: { name: string; firstSeen: number; lastSeen: number };
  pvData: Array<{ date: string; count: number }>;
  recentErrors: Array<{
    errorHash: string;
    type: string;
    message: string;
    count: number;
    lastSeen: number;
  }>;
}> = {};

for (const [serviceName, dashboard] of dashboardData.serviceDashboards) {
  serviceDashboards[serviceName] = {
    service: dashboard.service,
    pvData: Array.from(dashboard.pvData.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    recentErrors: dashboard.recentErrors,
  };
}

// Generate service pages dynamically
export const servicePages = services.map((service) => ({
  url: `/service/${service.name}/`,
  title: `${service.name} - Dashboard`,
  serviceName: service.name,
}));

// Generate error pages dynamically
export const errorPages: Array<{
  url: string;
  title: string;
  serviceName: string;
  errorHash: string;
  error: ErrorRecord;
}> = [];

for (const [serviceName, dashboard] of dashboardData.serviceDashboards) {
  for (const error of dashboard.recentErrors) {
    errorPages.push({
      url: `/error/${serviceName}/${error.errorHash}/`,
      title: `${error.type} - ${serviceName}`,
      serviceName,
      errorHash: error.errorHash,
      error,
    });
  }
}
