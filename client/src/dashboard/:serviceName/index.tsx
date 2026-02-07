// @jsxImportSource @remix-run/component
import { dashboardApi, InferResponseType } from "../api.ts";
import { createRoot, type Handle } from "@remix-run/component";

// Create typed client
const client = dashboardApi[":serviceName"];
type DashboardData = InferResponseType<typeof client.$get, 200>;

function DashboardContent(handle: Handle) {
  let dashboardData: DashboardData | null = null;
  let serviceName = "";
  let loading = true;
  let error: string | null = null;

  // Parse serviceName from URL and load dashboard
  const pathParts = globalThis.location.pathname.split("/");
  serviceName = decodeURIComponent(pathParts[2]);

  if (!serviceName) {
    error = "Service name not found in URL";
    loading = false;
  } else {
    // Load dashboard data
    client
      .$get({
        param: { serviceName },
      })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load dashboard data: " + res.statusText);
        }
        dashboardData = await res.json();
        loading = false;
        error = null;

        // Update breadcrumb and title
        const breadcrumbName = document.getElementById(
          "breadcrumb-service-name",
        );
        if (breadcrumbName) breadcrumbName.textContent = serviceName;
        const titleEl = document.getElementById("page-title");
        if (titleEl) titleEl.textContent = serviceName;

        handle.update();
      })
      .catch((err) => {
        console.error("Error loading dashboard:", err);
        loading = false;
        error = (err as Error).message;
        handle.update();
      });
  }

  return () => {
    if (loading) {
      return null; // Let the existing loading indicator handle this
    }

    if (error) {
      return null; // Let the existing error indicator handle this
    }

    if (!dashboardData) {
      return null;
    }

    const { service, pvData, recentErrors } = dashboardData;
    const totalPV = pvData.reduce((sum, item) => sum + item.count, 0);
    const maxPV = Math.max(...pvData.map((item) => item.count), 1);

    return (
      <>
        {/* Stats */}
        <div className="stats shadow mb-8 w-full">
          <div className="stat">
            <div className="stat-title">Total Page Views (30 days)</div>
            <div className="stat-value">{totalPV.toLocaleString()}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Recent Errors</div>
            <div className="stat-value text-error">{recentErrors.length}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Last Activity</div>
            <div className="stat-value text-sm">
              {new Date(service.lastSeen).toISOString().split("T")[0]}
            </div>
          </div>
        </div>

        {/* PV Graph */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title">Page Views - Last 30 Days</h2>
            {pvData.length > 0
              ? (
                <div className="w-full h-64 flex items-end gap-1">
                  {pvData.map(({ date, count }) => {
                    const heightPx = Math.max((count / maxPV) * 256, 2);
                    return (
                      <div
                        key={date}
                        className="flex-1 flex flex-col items-center group"
                        title={`${date}: ${count.toLocaleString()} views`}
                      >
                        <div
                          className="w-full bg-primary hover:bg-primary-focus transition-colors cursor-pointer rounded-t"
                          style={{ height: `${heightPx}px` }}
                        />
                        <div className="text-xs mt-1 text-base-content text-center font-mono">
                          {parseInt(date.split("-")[2], 10)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
              : (
                <p className="text-center py-8 opacity-50">
                  No page view data available
                </p>
              )}
          </div>
        </div>

        {/* Recent Errors */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Recent Errors</h2>
            {recentErrors.length > 0
              ? (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Message</th>
                        <th>Count</th>
                        <th>Last Seen</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentErrors.map((error) => (
                        <tr key={error.errorHash}>
                          <td>
                            <code className="badge badge-error badge-sm">
                              {error.type}
                            </code>
                          </td>
                          <td className="max-w-md truncate">{error.message}</td>
                          <td>
                            <div className="badge badge-neutral">
                              {error.count}
                            </div>
                          </td>
                          <td className="text-sm opacity-70">
                            {new Date(error.lastSeen).toISOString().split(
                              "T",
                            )[0]}
                          </td>
                          <td>
                            <a
                              href={`/dashboard/${serviceName}/error/${error.errorHash}`}
                              className="btn btn-ghost btn-xs"
                            >
                              Details →
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
              : (
                <div className="alert alert-success">
                  <span>
                    ✨ No errors detected! Your service is running smoothly.
                  </span>
                </div>
              )}
          </div>
        </div>
      </>
    );
  };
}

// Mount the component
const contentEl = document.getElementById("dashboard-content");
if (contentEl) {
  createRoot(contentEl).render(<DashboardContent />);

  // Hide loading indicator
  const loadingEl = document.getElementById("loading");
  if (loadingEl) loadingEl.classList.add("hidden");
}
