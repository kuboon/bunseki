// In-memory storage implementation for testing and development
// This is a simple implementation without persistence

import type { OtlpStorage } from "../storage.ts";
import type { SpanType } from "../schemas.ts";

/**
 * Simple in-memory storage for OTLP telemetry data
 * Useful for testing and development
 */
export class InMemoryStorage implements OtlpStorage {
  private spans: SpanType[] = [];
  private errors: Array<{
    serviceName: string;
    span: SpanType;
    exception: {
      type: string;
      message: string;
      stacktrace: string[];
    };
  }> = [];
  private counters: Map<string, number> = new Map();

  storeSpan(_serviceName: string, span: SpanType): Promise<void> {
    this.spans.push(span);
    return Promise.resolve();
  }

  storeError(
    serviceName: string,
    span: SpanType,
    exceptionEvent: {
      type: string;
      message: string;
      stacktrace: string[];
    },
  ): Promise<void> {
    this.errors.push({
      serviceName,
      span,
      exception: exceptionEvent,
    });
    return Promise.resolve();
  }

  incrementCounter(
    serviceName: string,
    counterName: string,
    keyName: string,
    _timestamp: number,
    count: number = 1,
  ): Promise<void> {
    const key = `${serviceName}:${counterName}:${keyName}`;
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + count);
    return Promise.resolve();
  }

  // Helper methods for testing
  getSpans(): SpanType[] {
    return [...this.spans];
  }

  getErrors() {
    return [...this.errors];
  }

  getCounters(): Map<string, number> {
    return new Map(this.counters);
  }

  clear(): void {
    this.spans = [];
    this.errors = [];
    this.counters.clear();
  }
}
