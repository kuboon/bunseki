export const layout = "layout.tsx";

interface ErrorPageData {
  errorPages: Array<{
    url: string;
    title: string;
    serviceName: string;
    errorHash: string;
    error: {
      errorHash: string;
      type: string;
      message: string;
      stacktrace: string[];
      count: number;
      firstSeen: number;
      lastSeen: number;
      serviceName: string;
      spans: string[];
    };
  }>;
}

// Generate pages for each error
export default function* (data: ErrorPageData) {
  const { errorPages } = data;

  for (const pageData of errorPages) {
    yield {
      url: pageData.url,
      title: pageData.title,
      content: (
        <ErrorDetailComponent
          serviceName={pageData.serviceName}
          errorHash={pageData.errorHash}
          error={pageData.error}
        />
      ),
    };
  }
}

interface ErrorDetailProps {
  serviceName: string;
  errorHash: string;
  error: {
    errorHash: string;
    type: string;
    message: string;
    stacktrace: string[];
    count: number;
    firstSeen: number;
    lastSeen: number;
    serviceName: string;
    spans: string[];
  };
}

function ErrorDetailComponent(
  { serviceName, errorHash, error }: ErrorDetailProps,
) {
  return (
    <div>
      <div class="breadcrumbs text-sm mb-4">
        <ul>
          <li>
            <a href="/">Services</a>
          </li>
          <li>
            <a href={`/service/${serviceName}/`}>{serviceName}</a>
          </li>
          <li>Error Details</li>
        </ul>
      </div>

      <h1 class="text-4xl font-bold mb-8">
        <span class="badge badge-error badge-lg mr-3">{error.type}</span>
        Error Details
      </h1>

      {/* Error Stats */}
      <div class="stats shadow mb-8 w-full">
        <div class="stat">
          <div class="stat-title">Occurrences</div>
          <div class="stat-value text-error">{error.count}</div>
        </div>
        <div class="stat">
          <div class="stat-title">First Seen</div>
          <div class="stat-value text-sm">
            {new Date(error.firstSeen).toLocaleString()}
          </div>
        </div>
        <div class="stat">
          <div class="stat-title">Last Seen</div>
          <div class="stat-value text-sm">
            {new Date(error.lastSeen).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Error Message */}
      <div class="card bg-base-200 shadow-xl mb-8">
        <div class="card-body">
          <h2 class="card-title">Error Message</h2>
          <div class="alert alert-error">
            <div>
              <div class="font-bold">{error.type}</div>
              <div class="text-sm">{error.message}</div>
            </div>
          </div>
          <div class="mt-4">
            <p class="text-sm opacity-70">
              <strong>Error Hash:</strong>{" "}
              <code class="text-xs">{errorHash}</code>
            </p>
            <p class="text-sm opacity-70">
              <strong>Service:</strong> {serviceName}
            </p>
            <p class="text-sm opacity-70">
              <strong>Related Spans:</strong> {error.spans.length}
            </p>
          </div>
        </div>
      </div>

      {/* Stack Trace */}
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Stack Trace</h2>
          <div class="mockup-code">
            {error.stacktrace.map((line, index) => (
              <pre key={index} data-prefix={index + 1}>
                <code>{line}</code>
              </pre>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
