export default function ServiceDashboardPage() {
  return (
    <div>
      <div class="breadcrumbs text-sm mb-4">
        <ul>
          <li>
            <a href="/">Services</a>
          </li>
          <li>
            <span id="breadcrumb-service-name"></span>
          </li>
        </ul>
      </div>

      <h1 id="page-title" class="text-4xl font-bold mb-8"></h1>

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
      <script type="module" src="./index.js"></script>
    </div>
  );
}
