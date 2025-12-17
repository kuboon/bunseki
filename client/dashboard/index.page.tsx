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
}

// Generate pages for each service
export default function* (data: PageData) {
  const { servicePages } = data;

  for (const pageData of servicePages) {
    yield {
      url: pageData.url,
      title: pageData.title,
      content: (
        <ServiceDashboardPage serviceName={pageData.serviceName} />
      ),
    };
  }
}

interface ServiceDashboardPageProps {
  serviceName: string;
}

function ServiceDashboardPage({ serviceName }: ServiceDashboardPageProps) {
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

      {/* Loading indicator */}
      <div id="loading" class="flex justify-center items-center py-16">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      {/* Error message */}
      <div id="error" class="alert alert-error hidden mb-8">
        <span></span>
      </div>

      {/* Dashboard content will be rendered here by client-side JS */}
      <div id="dashboard-content"></div>

      {/* Client-side script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  const serviceName = ${JSON.stringify(serviceName)};
  
  async function loadDashboard() {
    try {
      const response = await fetch('/api/dashboard/' + encodeURIComponent(serviceName));
      if (!response.ok) {
        throw new Error('Failed to load dashboard data: ' + response.statusText);
      }
      const dashboard = await response.json();
      
      // Hide loading
      document.getElementById('loading').classList.add('hidden');
      
      // Render dashboard
      renderDashboard(dashboard);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      document.getElementById('loading').classList.add('hidden');
      const errorEl = document.getElementById('error');
      errorEl.querySelector('span').textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  }
  
  function renderDashboard(dashboard) {
    const { service, pvData, recentErrors } = dashboard;
    const totalPV = pvData.reduce((sum, item) => sum + item.count, 0);
    const maxPV = Math.max(...pvData.map(item => item.count), 1);
    
    const html = \`
      <!-- Stats -->
      <div class="stats shadow mb-8 w-full">
        <div class="stat">
          <div class="stat-title">Total Page Views (30 days)</div>
          <div class="stat-value">\${totalPV.toLocaleString()}</div>
        </div>
        <div class="stat">
          <div class="stat-title">Recent Errors</div>
          <div class="stat-value text-error">\${recentErrors.length}</div>
        </div>
        <div class="stat">
          <div class="stat-title">Last Activity</div>
          <div class="stat-value text-sm">
            \${new Date(service.lastSeen).toLocaleString()}
          </div>
        </div>
      </div>

      <!-- PV Graph -->
      <div class="card bg-base-200 shadow-xl mb-8">
        <div class="card-body">
          <h2 class="card-title">Page Views - Last 30 Days</h2>
          \${pvData.length > 0 ? \`
            <div class="w-full h-64 flex items-end gap-1">
              \${pvData.map(({ date, count }) => {
                const heightPx = Math.max((count / maxPV) * 256, 2);
                return \`
                  <div class="flex-1 flex flex-col items-center group" title="\${date}: \${count.toLocaleString()} views">
                    <div class="w-full bg-primary hover:bg-primary-focus transition-colors cursor-pointer rounded-t" style="height: \${heightPx}px"></div>
                    <div class="text-xs mt-1 text-base-content text-center font-mono">\${parseInt(date.split('-')[2], 10)}</div>
                  </div>
                \`;
              }).join('')}
            </div>
          \` : \`
            <p class="text-center py-8 opacity-50">No page view data available</p>
          \`}
        </div>
      </div>

      <!-- Recent Errors -->
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Recent Errors</h2>
          \${recentErrors.length > 0 ? \`
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
                  \${recentErrors.map(error => \`
                    <tr>
                      <td><code class="badge badge-error badge-sm">\${error.type}</code></td>
                      <td class="max-w-md truncate">\${error.message}</td>
                      <td><div class="badge badge-neutral">\${error.count}</div></td>
                      <td class="text-sm opacity-70">\${new Date(error.lastSeen).toLocaleString()}</td>
                      <td>
                        <a href="/dashboard/\${serviceName}/error/\${error.errorHash}/" class="btn btn-ghost btn-xs">
                          Details →
                        </a>
                      </td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \` : \`
            <div class="alert alert-success">
              <span>✨ No errors detected! Your service is running smoothly.</span>
            </div>
          \`}
        </div>
      </div>
    \`;
    
    document.getElementById('dashboard-content').innerHTML = html;
  }
  
  // Load dashboard when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDashboard);
  } else {
    loadDashboard();
  }
})();
          `,
        }}
      >
      </script>
    </div>
  );
}

