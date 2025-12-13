import { toKeyValue, toUnixNano } from "../protojson.ts";
import { metricsRequestSchema } from "../schemas.ts";
import { dateNow, ExporterConfig } from "./utils.ts";

export function sendPVMetric(exporter: ExporterConfig, path: string) {
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
                      attributes: [
                        toKeyValue("url.path", path),
                      ],
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
  } satisfies typeof metricsRequestSchema.infer;

  // Send metric asynchronously (fire and forget)
  exporter.client.v1.metrics.$post({ json: metric }).catch((err) => {
    console.error("Failed to send PV metric:", err);
  });
}
