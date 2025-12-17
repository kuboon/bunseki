export const layout = "layout.tsx";

interface ErrorPageData {
  errorPages: Array<{
    url: string;
    title: string;
    serviceName: string;
    errorHash: string;
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
        <ErrorDetailPage
          serviceName={pageData.serviceName}
          errorHash={pageData.errorHash}
        />
      ),
    };
  }
}

interface ErrorDetailPageProps {
  serviceName: string;
  errorHash: string;
}

function ErrorDetailPage({ serviceName, errorHash }: ErrorDetailPageProps) {
  return (
    <div>
      <div class="breadcrumbs text-sm mb-4">
        <ul>
          <li>
            <a href="/">Services</a>
          </li>
          <li>
            <a href={`/dashboard/${serviceName}/`}>{serviceName}</a>
          </li>
          <li>Error Details</li>
        </ul>
      </div>

      <h1 class="text-4xl font-bold mb-8">
        <span id="error-type-badge" class="badge badge-error badge-lg mr-3">
        </span>
        Error Details
      </h1>

      {/* Loading indicator */}
      <div id="loading" class="flex justify-center items-center py-16">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      {/* Error message */}
      <div id="error-msg" class="alert alert-error hidden mb-8">
        <span></span>
      </div>

      {/* Error content will be rendered here by client-side JS */}
      <div id="error-content"></div>

      {/* Client-side script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  const serviceName = ${JSON.stringify(serviceName)};
  const errorHash = ${JSON.stringify(errorHash)};
  
  async function loadError() {
    try {
      const response = await fetch('/api/dashboard/' + encodeURIComponent(serviceName) + '/error/' + encodeURIComponent(errorHash));
      if (!response.ok) {
        throw new Error('Failed to load error data: ' + response.statusText);
      }
      const error = await response.json();
      
      // Hide loading
      document.getElementById('loading').classList.add('hidden');
      
      // Render error details
      renderError(error);
    } catch (error) {
      console.error('Error loading error details:', error);
      document.getElementById('loading').classList.add('hidden');
      const errorEl = document.getElementById('error-msg');
      errorEl.querySelector('span').textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  }
  
  function renderError(error) {
    // Update error type badge in title
    document.getElementById('error-type-badge').textContent = error.type;
    
    const html = \`
      <!-- Error Stats -->
      <div class="stats shadow mb-8 w-full">
        <div class="stat">
          <div class="stat-title">Occurrences</div>
          <div class="stat-value text-error">\${error.count}</div>
        </div>
        <div class="stat">
          <div class="stat-title">First Seen</div>
          <div class="stat-value text-sm">
            \${new Date(error.firstSeen).toLocaleString()}
          </div>
        </div>
        <div class="stat">
          <div class="stat-title">Last Seen</div>
          <div class="stat-value text-sm">
            \${new Date(error.lastSeen).toLocaleString()}
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div class="card bg-base-200 shadow-xl mb-8">
        <div class="card-body">
          <h2 class="card-title">Error Message</h2>
          <div class="alert alert-error">
            <div>
              <div class="font-bold">\${error.type}</div>
              <div class="text-sm">\${error.message}</div>
            </div>
          </div>
          <div class="mt-4">
            <p class="text-sm opacity-70">
              <strong>Error Hash:</strong> <code class="text-xs">\${errorHash}</code>
            </p>
            <p class="text-sm opacity-70">
              <strong>Service:</strong> \${serviceName}
            </p>
            <p class="text-sm opacity-70">
              <strong>Related Spans:</strong> \${error.spans.length}
            </p>
          </div>
        </div>
      </div>

      <!-- Stack Trace -->
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Stack Trace</h2>
          <div class="mockup-code">
            \${error.stacktrace.map((line, index) => \`
              <pre data-prefix="\${index + 1}"><code>\${line}</code></pre>
            \`).join('')}
          </div>
        </div>
      </div>
    \`;
    
    document.getElementById('error-content').innerHTML = html;
  }
  
  // Load error details when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadError);
  } else {
    loadError();
  }
})();
          `,
        }}
      >
      </script>
    </div>
  );
}
