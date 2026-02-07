// Storage interface for OTLP collector
// This allows the collector to be independent of the storage implementation

import type { SpanType } from "./schemas.ts";

/**
 * Storage interface for OTLP telemetry data
 */
export interface OtlpStorage {
  /**
   * Store a trace span
   */
  storeSpan(serviceName: string, span: SpanType): Promise<void>;

  /**
   * Store an error/exception from a span
   */
  storeError(
    serviceName: string,
    span: SpanType,
    exceptionEvent: {
      type: string;
      message: string;
      stacktrace: string[];
    },
  ): Promise<void>;

  /**
   * Increment a counter metric
   */
  incrementCounter(
    serviceName: string,
    counterName: string,
    keyName: string,
    timestamp: number,
    count?: number,
  ): Promise<void>;
}
