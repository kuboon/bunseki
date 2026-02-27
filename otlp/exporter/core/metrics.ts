import { toAttributes, toUnixNano } from "../../protojson.ts";
import { dateNow } from "../utils.ts";
import { IOtlpExporter, MetricsRequest } from "../types.ts";

export async function sendPVMetric(exporter: IOtlpExporter, path: string) {
  const now = dateNow();
  const timeUnixNano = toUnixNano(now);

  const metric = {
    resourceMetrics: [
      {
        resource: {
          attributes: [
            {
              key: "service.name",
              value: { stringValue: exporter.serviceName },
            },
          ],
        },
        scopeMetrics: [
          {
            scope: exporter.scope,
            metrics: [
              {
                name: "page_views",
                description: "Page view count",
                unit: "1",
                sum: {
                  dataPoints: [
                    {
                      attributes: toAttributes({
                        "url.path": path,
                      }),
                      startTimeUnixNano: timeUnixNano,
                      timeUnixNano: timeUnixNano,
                      asInt: "1",
                    },
                  ],
                  aggregationTemporality: 2, // DELTA
                  isMonotonic: true,
                },
              },
            ],
          },
        ],
      },
    ],
  } satisfies MetricsRequest;

  // Send metric asynchronously (fire and forget)
  await exporter.fetch("/v1/metrics", metric).catch((err) => {
    console.error("Failed to send PV metric:", err);
  });
}

export function sendRedirectMetric(
  exporter: IOtlpExporter,
  oldPath: string,
  newPath: string,
  route?: string,
  statusCode: number = 301,
) {
  const now = dateNow();
  const timeUnixNano = toUnixNano(now);

  const metric = {
    resourceMetrics: [
      {
        resource: {
          attributes: [
            {
              key: "service.name",
              value: { stringValue: exporter.serviceName },
            },
          ],
        },
        scopeMetrics: [
          {
            scope: exporter.scope,
            metrics: [
              {
                name: "http.server.request.count",
                sum: {
                  aggregationTemporality: 2,
                  isMonotonic: true,
                  dataPoints: [
                    {
                      attributes: toAttributes({
                        "http.request.method": "GET",
                        "url.path": oldPath,
                        "http.route": route ?? oldPath,
                        "http.response.status_code": statusCode,
                        "http.redirected_to": newPath,
                      }),
                      startTimeUnixNano: timeUnixNano,
                      timeUnixNano: timeUnixNano,
                      asInt: "1",
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  } satisfies MetricsRequest;

  // Send metric asynchronously (fire and forget)
  return exporter.fetch("/v1/metrics", metric).catch((err) => {
    console.error("Failed to send Redirect metric:", err);
  });
}
