import { scope, type } from "arktype";

const UINT64_MAX = 18_446_744_073_709_551_615n;
const INT64_MIN = -9_223_372_036_854_775_808n;
const INT64_MAX = 9_223_372_036_854_775_807n;

const UInt64String = type("string").pipe((value) => {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error("Expected unsigned integer string");
  }
  if (BigInt(value) > UINT64_MAX) {
    throw new Error("Value exceeds uint64 range");
  }
  return value;
});

const Int64String = type("string").pipe((value) => {
  if (!/^-?(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error("Expected signed integer string");
  }
  const number = BigInt(value);
  if (number < INT64_MIN || number > INT64_MAX) {
    throw new Error("Value exceeds int64 range");
  }
  return value;
});

const TraceId = type("string").pipe((value) => {
  if (!/^[0-9a-f]{32}$/i.test(value)) {
    throw new Error("traceId must be 32 hex characters");
  }
  if (/^0+$/i.test(value)) {
    throw new Error("traceId must not be all zeros");
  }
  return value;
});

const SpanId = type("string").pipe((value) => {
  if (!/^[0-9a-f]{16}$/i.test(value)) {
    throw new Error("spanId must be 16 hex characters");
  }
  if (/^0+$/i.test(value)) {
    throw new Error("spanId must not be all zeros");
  }
  return value;
});

// OTLP/HTTP Validation Schemas

// https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/common/v1/common.proto
const OtlpScope = scope({
  KeyValue: {
    key: "string",
    value: "AttributeValue",
  },
  AttributeValue: {
    "stringValue?": "string",
    "intValue?": "string",
    "doubleValue?": "number",
    "boolValue?": "boolean",
    "bytesValue?": "string",
    "nullValue?": "null | 'NULL_VALUE' | 0",
    "arrayValue?": {
      "values": "AttributeValue[]",
    },
    "kvlistValue?": {
      "values": "KeyValue[]",
    },
  },
});
const { AttributeValue: AnyValue, KeyValue } = OtlpScope.export();
export type AnyValueType = typeof AnyValue.infer;

// Span event
const SpanEvent = type({
  name: "string",
  timeUnixNano: UInt64String,
  "attributes?": KeyValue.array(),
  "droppedAttributesCount?": "number",
});
export type SpanEventType = typeof SpanEvent.infer;

// Span link
const SpanLink = type({
  traceId: TraceId,
  spanId: SpanId,
  "traceState?": "string",
  "attributes?": KeyValue.array(),
  "droppedAttributesCount?": "number",
});

// Span
const SpanSchema = type({
  traceId: TraceId,
  spanId: SpanId,
  "traceState?": "string",
  "parentSpanId?": SpanId,
  name: "string",
  "kind?": "number",
  startTimeUnixNano: UInt64String,
  endTimeUnixNano: UInt64String,
  "attributes?": KeyValue.array(),
  "droppedAttributesCount?": "number",
  "events?": SpanEvent.array(),
  "droppedEventsCount?": "number",
  "links?": SpanLink.array(),
  "droppedLinksCount?": "number",
  "status?": {
    "code?": "number",
    "message?": "string",
  },
});
export type SpanType = typeof SpanSchema.infer;

// Span scope spans
const ScopeSpans = type({
  "scope?": {
    name: "string",
    "version?": "string",
    "attributes?": KeyValue.array(),
  },
  spans: SpanSchema.array(),
  "schemaUrl?": "string",
});

// Resource spans
const ResourceSpans = type({
  "resource?": {
    attributes: KeyValue.array(),
    "droppedAttributesCount?": "number",
  },
  scopeSpans: ScopeSpans.array(),
  "schemaUrl?": "string",
});
// .pipe((data) => {
//   if (!data.resource) return data;
//   if (data.resource.attributes.some((attr) => attr.key === "service.name")) {
//     return data;;
//   }
//   throw new Error("resource.attributes must include service.name");
// });

// Traces request schema
export const tracesRequestSchema = type({
  resourceSpans: ResourceSpans.array(),
});

// Number data point
const NumberDataPoint = type({
  "attributes?": KeyValue.array(),
  startTimeUnixNano: UInt64String,
  timeUnixNano: UInt64String,
  "asDouble?": "number",
  "asInt?": Int64String,
  "exemplars?": "unknown[]",
});

// Sum metric
const Sum = type({
  dataPoints: NumberDataPoint.array(),
  "aggregationTemporality?": "number",
  "isMonotonic?": "boolean",
});

// Gauge metric
const Gauge = type({
  dataPoints: NumberDataPoint.array(),
});

// Metric
const Metric = type({
  name: "string",
  "description?": "string",
  "unit?": "string",
  "sum?": Sum,
  "gauge?": Gauge,
  "histogram?": "unknown",
  "exponentialHistogram?": "unknown",
  "summary?": "unknown",
});

// Metric scope metrics
const ScopeMetrics = type({
  "scope?": {
    name: "string",
    "version?": "string",
    "attributes?": KeyValue.array(),
  },
  metrics: Metric.array(),
  "schemaUrl?": "string",
});

// Resource metrics
const ResourceMetrics = type({
  "resource?": {
    attributes: KeyValue.array(),
    "droppedAttributesCount?": "number",
  },
  scopeMetrics: ScopeMetrics.array(),
  "schemaUrl?": "string",
});

// Metrics request schema
export const metricsRequestSchema = type({
  resourceMetrics: ResourceMetrics.array(),
});

// Log record
const LogRecord = type({
  timeUnixNano: UInt64String,
  "observedTimeUnixNano?": UInt64String,
  "severityNumber?": "number",
  "severityText?": "string",
  "body?": AnyValue,
  "attributes?": KeyValue.array(),
  "droppedAttributesCount?": "number",
  "flags?": "number",
  "traceId?": TraceId,
  "spanId?": SpanId,
});

// Log scope records
const ScopeLogRecords = type({
  "scope?": {
    name: "string",
    "version?": "string",
    "attributes?": KeyValue.array(),
  },
  logRecords: LogRecord.array(),
  "schemaUrl?": "string",
});

// Resource logs
const ResourceLogs = type({
  "resource?": {
    attributes: KeyValue.array(),
    "droppedAttributesCount?": "number",
  },
  scopeLogs: ScopeLogRecords.array(),
  "schemaUrl?": "string",
});

// Logs request schema
export const logsRequestSchema = type({
  resourceLogs: ResourceLogs.array(),
});
