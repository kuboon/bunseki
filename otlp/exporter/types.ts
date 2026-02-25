import {
  metricsRequestSchema,
  tracesRequestSchema,
} from "../collector/schemas.ts";

export type { SpanEventType, SpanType } from "../collector/schemas.ts";

export type TracesRequest = typeof tracesRequestSchema.infer;
export type MetricsRequest = typeof metricsRequestSchema.infer;

export const SpanKind = {
  INTERNAL: 1,
  SERVER: 2,
  CLIENT: 3,
  PRODUCER: 4,
  CONSUMER: 5,
} as const;
