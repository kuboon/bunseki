// @jsxImportSource @remix-run/component
import { createRoot, type Handle } from "@remix-run/component";
import { dashboardApi } from "./dashboard/api.ts";

// Create typed client
const client = dashboardApi.services;

interface ServiceInfo {
  name: string;
  firstSeen: number;
  lastSeen: number;
}

function ServicesList(handle: Handle) {
  let services: ServiceInfo[] | null = null;
  let loading = true;
  let error: string | null = null;

  // Load services
  client.$get()
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch services: ${res.statusText}`);
      }
      services = await res.json();
      loading = false;
      handle.update();
    })
    .catch((err) => {
      console.error("Error loading services:", err);
      error = (err as Error).message;
      loading = false;
      handle.update();
    });

  return () => {
    if (error) {
      return <div className="alert alert-error">Failed to load services</div>;
    }

    if (loading || !services) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-full text-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.name}
              className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow"
            >
              <div className="card-body">
                <h2 className="card-title">{service.name}</h2>
                <div className="card-actions justify-end mt-4">
                  <a
                    href={`/dashboard/${service.name}/`}
                    className="btn btn-primary btn-sm"
                  >
                    View Dashboard →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 stats shadow w-full">
          <div className="stat">
            <div className="stat-title">Total Services</div>
            <div className="stat-value">{services.length}</div>
          </div>
        </div>
      </>
    );
  };
}

// Mount the component
const container = document.getElementById("services-container");
if (container) {
  createRoot(container).render(<ServicesList />);
}
