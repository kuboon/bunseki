// @jsxImportSource @remix-run/component
import { dashboardApi, InferResponseType } from "../../api.ts";

import { createRoot, type Handle } from "@remix-run/component";

// Create typed client
const client = dashboardApi[":serviceName"].error[":errorHash"];

type ErrorData = InferResponseType<typeof client.$get, 200>;

function ErrorDetails(handle: Handle) {
  let errorData: ErrorData | null = null;
  let serviceName = "";
  let loading = true;
  let error: string | null = null;

  // Parse URL and load error details
  const pathParts = globalThis.location.pathname.split("/");
  serviceName = decodeURIComponent(pathParts[2]);
  const errorHash = pathParts[4];

  if (!serviceName) {
    error = "Service name not found in URL";
    loading = false;
  } else if (!errorHash) {
    error = "Error hash not found in URL";
    loading = false;
  } else {
    // Load error details
    client
      .$get({
        param: {
          serviceName,
          errorHash,
        },
      })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load error details: " + res.statusText);
        }
        errorData = await res.json();
        loading = false;
        error = null;

        // Update breadcrumb
        const breadcrumbLink = document.getElementById(
          "breadcrumb-service-link",
        );
        if (breadcrumbLink) {
          (breadcrumbLink as HTMLAnchorElement).href =
            `/dashboard/${serviceName}/`;
        }
        const breadcrumbName = document.getElementById(
          "breadcrumb-service-name",
        );
        if (breadcrumbName) {
          breadcrumbName.textContent = serviceName;
        }

        handle.update();
      })
      .catch((err) => {
        console.error("Error loading details:", err);
        loading = false;
        error = (err as Error).message;
        handle.update();
      });
  }

  return () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-16">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="alert alert-error mb-8">
          <span>{error}</span>
        </div>
      );
    }

    if (!errorData) {
      return null;
    }

    return (
      <>
        {/* Header Info */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title font-mono text-error">
              {errorData.type}
            </h2>
            <p className="text-lg font-semibold mt-2">{errorData.message}</p>

            <div className="flex gap-4 mt-4 text-sm opacity-70">
              <div>
                <span className="font-bold">Count:</span> {errorData.count}
              </div>
              <div>
                <span className="font-bold">First Seen:</span>{" "}
                {new Date(errorData.firstSeen).toISOString().split("T")[0]}
              </div>
              <div>
                <span className="font-bold">Last Seen:</span>{" "}
                {new Date(errorData.lastSeen).toISOString().split("T")[0]}
              </div>
            </div>
          </div>
        </div>

        {/* Stacktrace */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h3 className="card-title text-sm uppercase tracking-wide opacity-70">
              Stacktrace
            </h3>
            <div className="mockup-code bg-neutral text-neutral-content">
              <pre>
                <code className="block p-4 overflow-x-auto">
                  {errorData.stacktrace
                    ? errorData.stacktrace.join("\n")
                    : "No stacktrace available"}
                </code>
              </pre>
            </div>
          </div>
        </div>

        {/* Spans */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-sm uppercase tracking-wide opacity-70">
              Recent Spans
            </h3>
            <div className="flex flex-wrap gap-2">
              {errorData.spans && errorData.spans.length > 0
                ? (
                  errorData.spans.map((spanId: string) => (
                    <span
                      key={spanId}
                      className="badge badge-outline font-mono"
                    >
                      {spanId}
                    </span>
                  ))
                )
                : (
                  <span className="opacity-50 italic">
                    No associated spans found
                  </span>
                )}
            </div>
          </div>
        </div>
      </>
    );
  };
}

// Mount the component
const contentEl = document.getElementById("error-content");
if (contentEl) {
  createRoot(contentEl).render(<ErrorDetails />);
}
