export const layout = "layout.tsx";

export default function ServiceErrorPage() {
  return (
    <div>
      <div className="breadcrumbs text-sm mb-4">
        <ul>
          <li>
            <a href="/">Services</a>
          </li>
          <li>
            <a id="breadcrumb-service-link" href="#">
              <span id="breadcrumb-service-name"></span>
            </a>
          </li>
          <li>Error Details</li>
        </ul>
      </div>

      <h1 className="text-4xl font-bold mb-8">Error Details</h1>

      {/* Content area */}
      <div id="error-content"></div>

      {/* External script */}
      <script src="error.js"></script>
    </div>
  );
}
