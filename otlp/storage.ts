// Storage interface for OTLP collector
// This allows the collector to be independent of the storage implementation

import type { SpanEventType, SpanType } from "./schemas.ts";

/**
 * Storage interface for OTLP telemetry data
 */
export interface OtlpStorage {
  /**
   * Store a trace span
   */
  storeSpan(serviceName: string, span: SpanType): Promise<void>;

  /**
   * Store a span event
   */
  storeEvent(
    serviceName: string,
    span: SpanType,
    event: SpanEventType,
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
