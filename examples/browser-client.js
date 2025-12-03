// Browser client example for Bunseki analytics
// Include this script in your HTML pages

(function() {
  const ANALYTICS_URL = 'https://your-bunseki-server.com';
  const DOMAIN = 'o.kbn.one'; // or 'dd2030.org'
  
  // Generate a session ID (or retrieve from sessionStorage)
  function getSessionId() {
    let sessionId = sessionStorage.getItem('bunseki_session');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('bunseki_session', sessionId);
    }
    return sessionId;
  }
  
  // Track page view
  function trackPageView() {
    const data = {
      url: window.location.href,
      referrer: document.referrer,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      sessionId: getSessionId()
    };
    
    fetch(`${ANALYTICS_URL}/domains/${DOMAIN}/browser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).catch(err => console.error('Analytics error:', err));
  }
  
  // Track errors
  function trackError(error) {
    const data = {
      message: error.message,
      stack: error.stack,
      url: window.location.href
    };
    
    fetch(`${ANALYTICS_URL}/domains/${DOMAIN}/browser/error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).catch(err => console.error('Error tracking failed:', err));
  }
  
  // Set up error tracking
  window.addEventListener('error', (event) => {
    trackError({
      message: event.message,
      stack: event.error?.stack
    });
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    trackError({
      message: `Unhandled Promise Rejection: ${event.reason}`,
      stack: event.reason?.stack
    });
  });
  
  // Track page view on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView);
  } else {
    trackPageView();
  }
  
  // Expose API for manual tracking
  window.bunseki = {
    track: trackPageView,
    error: trackError
  };
})();
