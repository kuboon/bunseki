// Client-side TypeScript for analytics dashboard

interface BrowserEvent {
  timestamp: number;
  url: string;
  referrer?: string;
  language?: string;
  screenResolution?: string;
  sessionId?: string;
}

interface ServerEvent {
  timestamp: number;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  ip?: string;
}

interface ErrorEvent {
  timestamp: number;
  message: string;
  stack?: string;
  url?: string;
  type: "browser" | "server";
}

interface DailyStats {
  date: string;
  pageViews: number;
  uniqueSessions: number;
  errors: number;
  serverRequests: number;
  avgDuration: number;
}

interface AnalyticsData {
  browserEvents: BrowserEvent[];
  serverEvents: ServerEvent[];
  errorEvents: ErrorEvent[];
  dailyStats: DailyStats[];
}

// Get domain from URL path
function getDomain(): string {
  const path = window.location.pathname;
  const match = path.match(/\/domains\/([^\/]+)/);
  return match ? match[1] : "";
}

// Fetch analytics data from API
async function fetchData(): Promise<AnalyticsData> {
  const domain = getDomain();
  const response = await fetch(`/domains/${domain}/api/data`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }
  
  return await response.json();
}

// Format timestamp to readable date/time
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Format date to short format
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Helper function to get element by ID
function getById(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element not found: ${id}`);
  return el;
}

// Render summary statistics
function renderStats(data: AnalyticsData) {
  const totalPageViews = data.dailyStats.reduce((sum, day) => sum + day.pageViews, 0);
  const totalErrors = data.dailyStats.reduce((sum, day) => sum + day.errors, 0);
  const totalServerRequests = data.dailyStats.reduce((sum, day) => sum + day.serverRequests, 0);
  
  let avgDuration = 0;
  const daysWithRequests = data.dailyStats.filter(day => day.serverRequests > 0);
  if (daysWithRequests.length > 0) {
    avgDuration = Math.round(
      daysWithRequests.reduce((sum, day) => sum + day.avgDuration, 0) / daysWithRequests.length
    );
  }
  
  getById("total-pageviews").textContent = totalPageViews.toString();
  getById("total-errors").textContent = totalErrors.toString();
  getById("total-server-requests").textContent = totalServerRequests.toString();
  getById("avg-response-time").textContent = `${avgDuration}ms`;
}

// Render bar chart for daily page views
function renderChart(data: AnalyticsData) {
  const chartEl = getById("pageview-chart");
  chartEl.innerHTML = "";
  
  if (data.dailyStats.length === 0) {
    chartEl.innerHTML = "<p>No data available</p>";
    return;
  }
  
  // Find max views safely without spread operator
  let maxViews = 1;
  for (const day of data.dailyStats) {
    if (day.pageViews > maxViews) {
      maxViews = day.pageViews;
    }
  }
  
  data.dailyStats.forEach(day => {
    const bar = document.createElement("div");
    bar.className = "bar";
    const height = (day.pageViews / maxViews) * 100;
    bar.style.height = `${height}%`;
    bar.title = `${formatDate(day.date)}: ${day.pageViews} views`;
    
    const label = document.createElement("div");
    label.className = "bar-label";
    label.textContent = formatDate(day.date);
    bar.appendChild(label);
    
    chartEl.appendChild(bar);
  });
}

// Render browser events table
function renderBrowserEvents(events: BrowserEvent[]) {
  const tbody = getById("browser-events");
  tbody.innerHTML = "";
  
  if (events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No browser events</td></tr>';
    return;
  }
  
  events.slice(0, 50).forEach(event => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatTimestamp(event.timestamp)}</td>
      <td>${event.url}</td>
      <td>${event.referrer || "-"}</td>
      <td>${event.language || "-"}</td>
    `;
    tbody.appendChild(row);
  });
}

// Render server events table
function renderServerEvents(events: ServerEvent[]) {
  const tbody = getById("server-events");
  tbody.innerHTML = "";
  
  if (events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No server events</td></tr>';
    return;
  }
  
  events.slice(0, 50).forEach(event => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatTimestamp(event.timestamp)}</td>
      <td>${event.endpoint}</td>
      <td>${event.method}</td>
      <td>${event.statusCode}</td>
      <td>${event.duration}ms</td>
    `;
    tbody.appendChild(row);
  });
}

// Render error events table
function renderErrorEvents(events: ErrorEvent[]) {
  const tbody = getById("error-events");
  tbody.innerHTML = "";
  
  if (events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No errors</td></tr>';
    return;
  }
  
  events.slice(0, 50).forEach(event => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatTimestamp(event.timestamp)}</td>
      <td>${event.type}</td>
      <td>${event.message}</td>
      <td>${event.url || "-"}</td>
    `;
    tbody.appendChild(row);
  });
}

// Main initialization
async function init() {
  try {
    const data = await fetchData();
    
    renderStats(data);
    renderChart(data);
    renderBrowserEvents(data.browserEvents);
    renderServerEvents(data.serverEvents);
    renderErrorEvents(data.errorEvents);
    
    getById("loading").style.display = "none";
    getById("dashboard").style.display = "block";
  } catch (error) {
    console.error("Failed to load analytics data:", error);
    getById("loading").style.display = "none";
    const errorEl = getById("error");
    errorEl.textContent = `Error loading analytics data: ${error instanceof Error ? error.message : String(error)}`;
    errorEl.style.display = "block";
  }
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
