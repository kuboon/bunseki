// Lume data file - provides data to static pages during build
import { initStorage } from "../storage/mod.ts";

// Initialize storage on load
await initStorage();

export const layout = "layout.tsx";

export const services = ["o.kbn.one", "dd2030.org"];

// Generate service pages dynamically
export const servicePages = services.map((service) => ({
  url: `/dashboard/${service}/`,
  title: `${service} - Dashboard`,
  serviceName: service,
}));
