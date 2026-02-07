// Client-side code for index page
import { hc } from "@hono/hono/client";
import type { DashboardApiType } from "../api/dashboard.ts";

// Create typed client
const client = hc<DashboardApiType>("/");

interface ServiceInfo {
  name: string;
  firstSeen: number;
  lastSeen: number;
}

async function loadServices() {
  try {
    const res = await client.api.dashboard.services.$get();
    if (!res.ok) {
      throw new Error(`Failed to fetch services: ${res.statusText}`);
    }
    const services: ServiceInfo[] = await res.json();
    renderServices(services);
  } catch (error) {
    console.error("Error loading services:", error);
    document.getElementById("services-container")!.innerHTML =
      `<div class="alert alert-error">Failed to load services</div>`;
  }
}

function renderServices(services: ServiceInfo[]) {
  const now = Date.now();
  const activeServices = services.filter((s) => (now - s.lastSeen) < 3600000);

  // Render service cards
  const servicesGrid = services.map((service) => {
    return `
      <div class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
        <div class="card-body">
          <h2 class="card-title">${service.name}</h2>
          <div class="card-actions justify-end mt-4">
            <a href="/dashboard/${service.name}/" class="btn btn-primary btn-sm">
              View Dashboard →
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");

  document.getElementById("services-grid")!.innerHTML = servicesGrid;

  // Update stats
  document.getElementById("total-services")!.textContent = services.length
    .toString();
  document.getElementById("active-services")!.textContent = activeServices
    .length.toString();
}

// Load services when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadServices);
} else {
  loadServices();
}
