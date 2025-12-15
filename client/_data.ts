// Lume data file - provides data to static pages during build
import { getDashboardData, initStorage } from "../storage/mod.ts";

// Initialize storage on load
await initStorage();

export const layout = "layout.tsx";

// Get dashboard data for all services
const dashboardData = await getDashboardData(30);

export const services = dashboardData.services;

// Generate service pages dynamically
export const servicePages = services.map((service) => ({
  url: `/dashboard/${service.name}/`,
  title: `${service.name} - Dashboard`,
  serviceName: service.name,
}));

// Generate error pages dynamically
export const errorPages: Array<{
  url: string;
  title: string;
  serviceName: string;
  errorHash: string;
}> = [];

for (const [serviceName, dashboard] of dashboardData.serviceDashboards) {
  for (const error of dashboard.recentErrors) {
    errorPages.push({
      url: `/dashboard/${serviceName}/error/${error.errorHash}/`,
      title: `${error.type} - ${serviceName}`,
      serviceName,
      errorHash: error.errorHash,
    });
  }
}
