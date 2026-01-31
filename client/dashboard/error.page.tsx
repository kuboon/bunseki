export const layout = "layout.tsx";
import { services } from "../_data.ts";

// Generate error page for each service
export default function* () {
  for (const serviceName of services) {
    yield {
      url: `/dashboard/${serviceName}/error.html`,
      title: `${serviceName} - Error Details`,
      content: <ServiceErrorPage serviceName={serviceName} />,
    };
  }
}

interface ServiceErrorPageProps {
  serviceName: string;
}

function ServiceErrorPage({ serviceName }: ServiceErrorPageProps) {
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

      <h1 class="text-4xl font-bold mb-8">Error Details</h1>

      {/* Loading indicator */}
      <div id="loading" class="flex justify-center items-center py-16">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      {/* Error message */}
      <div id="error-alert" class="alert alert-error hidden mb-8">
        <span></span>
      </div>

      {/* Content area */}
      <div id="error-content" class="hidden">
        {/* Header Info */}
        <div class="card bg-base-200 shadow-xl mb-8">
          <div class="card-body">
            <h2 id="error-type" class="card-title font-mono text-error"></h2>
            <p id="error-message" class="text-lg font-semibold mt-2"></p>

            <div class="flex gap-4 mt-4 text-sm opacity-70">
              <div>
                <span class="font-bold">Count:</span> <span id="error-count"></span>
              </div>
              <div>
                <span class="font-bold">First Seen:</span> <span id="error-first-seen"></span>
              </div>
              <div>
                <span class="font-bold">Last Seen:</span> <span id="error-last-seen"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Stacktrace */}
        <div class="card bg-base-200 shadow-xl mb-8">
          <div class="card-body">
            <h3 class="card-title text-sm uppercase tracking-wide opacity-70">Stacktrace</h3>
            <div class="mockup-code bg-neutral text-neutral-content">
              <pre><code id="error-stacktrace" class="block p-4 overflow-x-auto"></code></pre>
            </div>
          </div>
        </div>

        {/* Spans */}
        <div class="card bg-base-200 shadow-xl">
          <div class="card-body">
            <h3 class="card-title text-sm uppercase tracking-wide opacity-70">Recent Spans</h3>
            <div id="error-spans" class="flex flex-wrap gap-2">
              {/* Spans will be inserted here */}
            </div>
          </div>
        </div>
      </div>

      {/* Client-side script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  const serviceName = ${JSON.stringify(serviceName)};

  async function loadErrorDetails() {
    try {
      // Parse error hash from URL
      // URL format: /dashboard/:serviceName/error/:errorHash
      const pathParts = window.location.pathname.split('/');
      // ["", "dashboard", "serviceName", "error", "errorHash"]
      const errorHash = pathParts[4];

      if (!errorHash) {
        throw new Error('Error hash not found in URL');
      }

      const response = await fetch('/api/dashboard/' + encodeURIComponent(serviceName) + '/error/' + encodeURIComponent(errorHash));

      if (!response.ok) {
        throw new Error('Failed to load error details: ' + response.statusText);
      }

      const errorData = await response.json();
      renderErrorDetails(errorData);

    } catch (error) {
      console.error('Error loading details:', error);
      document.getElementById('loading').classList.add('hidden');
      const errorEl = document.getElementById('error-alert');
      errorEl.querySelector('span').textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  }

  function renderErrorDetails(data) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error-content').classList.remove('hidden');

    // Header
    document.getElementById('error-type').textContent = data.type;
    document.getElementById('error-message').textContent = data.message;
    document.getElementById('error-count').textContent = data.count;
    document.getElementById('error-first-seen').textContent = new Date(data.firstSeen).toLocaleString();
    document.getElementById('error-last-seen').textContent = new Date(data.lastSeen).toLocaleString();

    // Stacktrace
    const stacktraceText = data.stacktrace.join('\\n');
    document.getElementById('error-stacktrace').textContent = stacktraceText;

    // Spans
    const spansContainer = document.getElementById('error-spans');
    spansContainer.innerHTML = ''; // Clear previous content

    if (data.spans && data.spans.length > 0) {
      data.spans.forEach(spanId => {
        const span = document.createElement('span');
        span.className = 'badge badge-outline font-mono';
        span.textContent = spanId;
        spansContainer.appendChild(span);
      });
    } else {
      const emptyMsg = document.createElement('span');
      emptyMsg.className = 'opacity-50 italic';
      emptyMsg.textContent = 'No associated spans found';
      spansContainer.appendChild(emptyMsg);
    }
  }

  // Load when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadErrorDetails);
  } else {
    loadErrorDetails();
  }
})();
          `,
        }}
      >
      </script>
    </div>
  );
}
