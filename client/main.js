// Client-side code for analytics view page

// Get domain from URL path
function getDomainFromPath() {
  const path = window.location.pathname;
  const match = path.match(/\/domains\/([^\/]+)\/view/);
  return match ? match[1] : null;
}

// Fetch analytics data from API
async function fetchAnalyticsData(domain) {
  const response = await fetch(`/domains/${domain}/api/data`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }
  return response.json();
}

// Render daily stats chart
function renderDailyStatsChart(stats) {
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
function renderStatsSummary(data) {
  const summaryContainer = document.getElementById("stats-summary");
  if (!summaryContainer) return;

  const totalPageViews = data.dailyStats.reduce((sum, s) => sum + s.pageViews, 0);
  const totalErrors = data.dailyStats.reduce((sum, s) => sum + s.errors, 0);
  const totalServerRequests = data.dailyStats.reduce((sum, s) => sum + s.serverRequests, 0);
  
  // Calculate weighted average duration based on request counts
  let avgDuration = 0;
  if (totalServerRequests > 0) {
    const totalDuration = data.dailyStats.reduce(
      (sum, s) => sum + (s.avgDuration * s.serverRequests), 
      0
    );
    avgDuration = totalDuration / totalServerRequests;
  }

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
function renderBrowserEventsTable(events) {
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
function renderServerEventsTable(events) {
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
function renderErrorEventsTable(events) {
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
function truncate(str, length) {
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
}

// Main initialization
async function init() {
  const domain = getDomainFromPath();
  
  if (!domain) {
    showError("Could not determine domain from URL");
    return;
  }

  // Update domain name
  const domainEl = document.getElementById("domain-name");
  if (domainEl) {
    domainEl.textContent = domain;
  }

  try {
    // Fetch data from API
    const data = await fetchAnalyticsData(domain);

    // Hide loading, show content
    document.getElementById("loading").style.display = "none";
    document.getElementById("content").style.display = "block";

    // Render all components
    renderStatsSummary(data);
    renderDailyStatsChart(data.dailyStats);
    renderBrowserEventsTable(data.browserEvents);
    renderServerEventsTable(data.serverEvents);
    renderErrorEventsTable(data.errorEvents);
  } catch (error) {
    console.error("Failed to load analytics data:", error);
    showError(`Failed to load data: ${error.message}`);
  }
}

function showError(message) {
  document.getElementById("loading").style.display = "none";
  const errorEl = document.getElementById("error");
  errorEl.textContent = message;
  errorEl.style.display = "block";
}

// Run init when DOM is ready
document.addEventListener("DOMContentLoaded", init);
