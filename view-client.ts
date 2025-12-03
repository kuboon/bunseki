// Client-side code for analytics view page
// This will be bundled using deno-emit library

interface ViewData {
  domain: string;
  browserEvents: Array<{
    timestamp: number;
    url: string;
    referrer?: string;
    userAgent?: string;
    screenResolution?: string;
    language?: string;
    sessionId?: string;
  }>;
  serverEvents: Array<{
    timestamp: number;
    endpoint: string;
    method: string;
    statusCode: number;
    duration: number;
    userAgent?: string;
    ip?: string;
  }>;
  errorEvents: Array<{
    timestamp: number;
    message: string;
    stack?: string;
    url?: string;
    userAgent?: string;
    type: "browser" | "server";
  }>;
  dailyStats: Array<{
    date: string;
    pageViews: number;
    uniqueSessions: number;
    errors: number;
    serverRequests: number;
    avgDuration: number;
  }>;
}

// Render daily stats chart
function renderDailyStatsChart(stats: ViewData["dailyStats"]) {
  const chartContainer = document.getElementById("daily-stats-chart");
  if (!chartContainer) return;

  // Sort stats by date
  const sortedStats = [...stats].sort((a, b) => a.date.localeCompare(b.date));

  // Create simple bar chart using HTML/CSS
  const maxPageViews = Math.max(...sortedStats.map((s) => s.pageViews), 1);

  const html = `
    <div class="chart">
      <h3>Daily Page Views (Last ${sortedStats.length} days)</h3>
      <div class="bars">
        ${
    sortedStats.map((stat) => {
      const height = (stat.pageViews / maxPageViews) * 200;
      return `
            <div class="bar-container">
              <div class="bar" style="height: ${height}px" title="${stat.date}: ${stat.pageViews} views">
                <span class="bar-value">${stat.pageViews}</span>
              </div>
              <div class="bar-label">${stat.date.slice(5)}</div>
            </div>
          `;
    }).join("")
  }
      </div>
    </div>
  `;

  chartContainer.innerHTML = html;
}

// Render stats summary
function renderStatsSummary(data: ViewData) {
  const summaryContainer = document.getElementById("stats-summary");
  if (!summaryContainer) return;

  const totalPageViews = data.dailyStats.reduce((sum, s) => sum + s.pageViews, 0);
  const totalErrors = data.dailyStats.reduce((sum, s) => sum + s.errors, 0);
  const totalServerRequests = data.dailyStats.reduce((sum, s) => sum + s.serverRequests, 0);
  const avgDuration = data.dailyStats.length > 0
    ? data.dailyStats.reduce((sum, s) => sum + s.avgDuration, 0) / data.dailyStats.length
    : 0;

  const html = `
    <div class="summary-cards">
      <div class="card">
        <h3>Total Page Views</h3>
        <div class="value">${totalPageViews}</div>
      </div>
      <div class="card">
        <h3>Total Errors</h3>
        <div class="value">${totalErrors}</div>
      </div>
      <div class="card">
        <h3>Server Requests</h3>
        <div class="value">${totalServerRequests}</div>
      </div>
      <div class="card">
        <h3>Avg Response Time</h3>
        <div class="value">${avgDuration.toFixed(2)}ms</div>
      </div>
    </div>
  `;

  summaryContainer.innerHTML = html;
}

// Render browser events table
function renderBrowserEventsTable(events: ViewData["browserEvents"]) {
  const tableContainer = document.getElementById("browser-events-table");
  if (!tableContainer) return;

  const html = `
    <h3>Recent Browser Events</h3>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>URL</th>
          <th>Referrer</th>
          <th>Screen</th>
          <th>Language</th>
        </tr>
      </thead>
      <tbody>
        ${
    events.slice(0, 50).map((event) => {
      const date = new Date(event.timestamp);
      return `
            <tr>
              <td>${date.toLocaleString()}</td>
              <td class="url-cell" title="${event.url}">${truncate(event.url, 50)}</td>
              <td>${event.referrer || "-"}</td>
              <td>${event.screenResolution || "-"}</td>
              <td>${event.language || "-"}</td>
            </tr>
          `;
    }).join("")
  }
      </tbody>
    </table>
  `;

  tableContainer.innerHTML = html;
}

// Render server events table
function renderServerEventsTable(events: ViewData["serverEvents"]) {
  const tableContainer = document.getElementById("server-events-table");
  if (!tableContainer) return;

  const html = `
    <h3>Recent Server Events</h3>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Method</th>
          <th>Endpoint</th>
          <th>Status</th>
          <th>Duration (ms)</th>
        </tr>
      </thead>
      <tbody>
        ${
    events.slice(0, 50).map((event) => {
      const date = new Date(event.timestamp);
      const statusClass = event.statusCode >= 400 ? "error" : "success";
      return `
            <tr>
              <td>${date.toLocaleString()}</td>
              <td>${event.method}</td>
              <td class="url-cell" title="${event.endpoint}">${truncate(event.endpoint, 40)}</td>
              <td class="${statusClass}">${event.statusCode}</td>
              <td>${event.duration}</td>
            </tr>
          `;
    }).join("")
  }
      </tbody>
    </table>
  `;

  tableContainer.innerHTML = html;
}

// Render error events table
function renderErrorEventsTable(events: ViewData["errorEvents"]) {
  const tableContainer = document.getElementById("error-events-table");
  if (!tableContainer) return;

  const html = `
    <h3>Recent Error Events</h3>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Type</th>
          <th>Message</th>
          <th>URL</th>
        </tr>
      </thead>
      <tbody>
        ${
    events.slice(0, 50).map((event) => {
      const date = new Date(event.timestamp);
      return `
            <tr>
              <td>${date.toLocaleString()}</td>
              <td><span class="badge ${event.type}">${event.type}</span></td>
              <td class="error-message" title="${event.message}">${truncate(event.message, 60)}</td>
              <td>${event.url || "-"}</td>
            </tr>
          `;
    }).join("")
  }
      </tbody>
    </table>
  `;

  tableContainer.innerHTML = html;
}

// Utility function to truncate strings
function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
}

// Extend Window interface to include our injected data
declare global {
  interface Window {
    viewData?: ViewData;
  }
}

// Main initialization
function init() {
  // Get data from window object (injected by server)
  const data = window.viewData;

  if (!data) {
    console.error("No view data found");
    return;
  }

  // Update domain name
  const domainEl = document.getElementById("domain-name");
  if (domainEl) {
    domainEl.textContent = data.domain;
  }

  // Render all components
  renderStatsSummary(data);
  renderDailyStatsChart(data.dailyStats);
  renderBrowserEventsTable(data.browserEvents);
  renderServerEventsTable(data.serverEvents);
  renderErrorEventsTable(data.errorEvents);
}

// Run init when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
