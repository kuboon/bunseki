export const layout = "layout.tsx";

interface ServiceDashboard {
  service: {
    name: string;
    firstSeen: number;
    lastSeen: number;
  };
  pvData: Array<{ date: string; count: number }>;
  recentErrors: Array<{
    errorHash: string;
    type: string;
    message: string;
    count: number;
    lastSeen: number;
  }>;
}

interface PageData {
  servicePages: Array<{ url: string; title: string; serviceName: string }>;
  serviceDashboards: Record<string, ServiceDashboard>;
}

// Generate pages for each service
export default function* (data: PageData) {
  const { servicePages, serviceDashboards } = data;

  for (const pageData of servicePages) {
    yield {
      url: pageData.url,
      title: pageData.title,
      content: (
        <ServiceDashboardComponent
          serviceName={pageData.serviceName}
          serviceDashboards={serviceDashboards}
        />
      ),
    };
  }
}

interface ServiceDashboardProps {
  serviceName: string;
  serviceDashboards: Record<string, ServiceDashboard>;
}

function ServiceDashboardComponent(
  { serviceName, serviceDashboards }: ServiceDashboardProps,
) {
  const dashboard = serviceDashboards[serviceName];

  if (!dashboard) {
    return (
      <div class="alert alert-error">
        <span>Service "{serviceName}" not found</span>
      </div>
    );
  }

  const { service, pvData, recentErrors } = dashboard;

  // pvData is already a sorted array from _data.ts
  const pvArray = pvData;

  const totalPV = pvArray.reduce((sum, { count }) => sum + count, 0);
  const maxPV = Math.max(...pvArray.map(({ count }) => count), 1);

  return (
    <div>
      <div class="breadcrumbs text-sm mb-4">
        <ul>
          <li>
            <a href="/">Services</a>
          </li>
          <li>{serviceName}</li>
        </ul>
      </div>

      <h1 class="text-4xl font-bold mb-8">{serviceName}</h1>

      {/* Stats */}
      <div class="stats shadow mb-8 w-full">
        <div class="stat">
          <div class="stat-title">Total Page Views (30 days)</div>
          <div class="stat-value">{totalPV.toLocaleString()}</div>
        </div>
        <div class="stat">
          <div class="stat-title">Recent Errors</div>
          <div class="stat-value text-error">{recentErrors.length}</div>
        </div>
        <div class="stat">
          <div class="stat-title">Last Activity</div>
          <div class="stat-value text-sm">
            {new Date(service.lastSeen).toLocaleString()}
          </div>
        </div>
      </div>

      {/* PV Graph */}
      <div class="card bg-base-200 shadow-xl mb-8">
        <div class="card-body">
          <h2 class="card-title">Page Views - Last 30 Days</h2>
          {pvArray.length > 0
            ? (
              <div class="w-full h-64 flex items-end gap-1">
                {pvArray.map(({ date, count }) => {
                  const heightPx = Math.max((count / maxPV) * 256, 2);
                  return (
                    <div
                      key={date}
                      class="flex-1 flex flex-col items-center group"
                      title={`${date}: ${count.toLocaleString()} views`}
                    >
                      <div
                        class="w-full bg-primary hover:bg-primary-focus transition-colors cursor-pointer rounded-t"
                        style={{ height: `${heightPx}px` }}
                      >
                      </div>
                      <div class="text-xs mt-1 text-base-content text-center font-mono">
                        {parseInt(date.split("-")[2], 10)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
            : (
              <p class="text-center py-8 opacity-50">
                No page view data available
              </p>
            )}
        </div>
      </div>

      {/* Recent Errors */}
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Recent Errors</h2>
          {recentErrors.length > 0
            ? (
              <div class="overflow-x-auto">
                <table class="table table-zebra">
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
                          <code class="badge badge-error badge-sm">
                            {error.type}
                          </code>
                        </td>
                        <td class="max-w-md truncate">{error.message}</td>
                        <td>
                          <div class="badge badge-neutral">{error.count}</div>
                        </td>
                        <td class="text-sm opacity-70">
                          {new Date(error.lastSeen).toLocaleString()}
                        </td>
                        <td>
                          <a
                            href={`/dashboard/${serviceName}/error/${error.errorHash}/`}
                            class="btn btn-ghost btn-xs"
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
              <div class="alert alert-success">
                <span>
                  ✨ No errors detected! Your service is running smoothly.
                </span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
