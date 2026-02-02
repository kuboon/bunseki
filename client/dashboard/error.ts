(function() {
  async function loadErrorDetails() {
    try {
      // Parse serviceName and errorHash from URL
      // URL format: /dashboard/:serviceName/error/:errorHash
      const pathParts = window.location.pathname.split('/');
      // ["", "dashboard", "serviceName", "error", "errorHash"]
      const serviceName = decodeURIComponent(pathParts[2]);
      const errorHash = pathParts[4];

      if (!serviceName) {
        throw new Error('Service name not found in URL');
      }

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
      const loadingEl = document.getElementById('loading');
      if (loadingEl) loadingEl.classList.add('hidden');

      const errorEl = document.getElementById('error-alert');
      if (errorEl) {
        const span = errorEl.querySelector('span');
        if (span) span.textContent = error.message;
        errorEl.classList.remove('hidden');
      }
    }
  }

  function renderErrorDetails(data) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.add('hidden');

    const contentEl = document.getElementById('error-content');
    if (contentEl) contentEl.classList.remove('hidden');

    // Header
    const typeEl = document.getElementById('error-type');
    if (typeEl) typeEl.textContent = data.type;

    const msgEl = document.getElementById('error-message');
    if (msgEl) msgEl.textContent = data.message;

    const countEl = document.getElementById('error-count');
    if (countEl) countEl.textContent = data.count;

    const firstSeenEl = document.getElementById('error-first-seen');
    if (firstSeenEl) firstSeenEl.textContent = new Date(data.firstSeen).toLocaleString();

    const lastSeenEl = document.getElementById('error-last-seen');
    if (lastSeenEl) lastSeenEl.textContent = new Date(data.lastSeen).toLocaleString();

    // Stacktrace
    const stacktraceEl = document.getElementById('error-stacktrace');
    if (stacktraceEl && data.stacktrace) {
      const stacktraceText = data.stacktrace.join('\n');
      stacktraceEl.textContent = stacktraceText;
    }

    // Spans
    const spansContainer = document.getElementById('error-spans');
    if (spansContainer) {
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
  }

  // Load when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadErrorDetails);
  } else {
    loadErrorDetails();
  }
})();
