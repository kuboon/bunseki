import { scope, type } from "arktype";

// OTLP/HTTP Validation Schemas

// https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/common/v1/common.proto
const AnyValueScope = scope({
  AttributeValue: {
    "stringValue?": "string",
    "intValue?": "string",
    "doubleValue?": "number",
    "boolValue?": "boolean",
    "bytesValue?": "string",
    "arrayValue?": {
      "values": "AttributeValue[]",
    },
  },
});
const AnyValue = AnyValueScope.export().AttributeValue;
export type AnyValueType = typeof AnyValue.infer;

const KeyValue = type({
  key: "string",
  value: AnyValue,
});

// Span event
const SpanEvent = type({
  name: "string",
  timeUnixNano: "string",
  "attributes?": KeyValue.array(),
  "droppedAttributesCount?": "number",
});
export type SpanEventType = typeof SpanEvent.infer;

// Span link
const SpanLink = type({
  traceId: "string",
  spanId: "string",
  "traceState?": "string",
  "attributes?": KeyValue.array(),
  "droppedAttributesCount?": "number",
});

export const SpanKind = {
  INTERNAL: 1,
  SERVER: 2,
  CLIENT: 3,
  PRODUCER: 4,
  CONSUMER: 5,
};

// Span
const Span = type({
  traceId: "string",
  spanId: "string",
  "traceState?": "string",
  "parentSpanId?": "string",
  name: "string",
  "kind?": "number",
  startTimeUnixNano: "string",
  endTimeUnixNano: "string",
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
export type SpanType = typeof Span.infer;

// Span scope spans
const ScopeSpans = type({
  "scope?": {
    name: "string",
    "version?": "string",
    "attributes?": KeyValue.array(),
  },
  spans: Span.array(),
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
  startTimeUnixNano: "string",
  timeUnixNano: "string",
  "asDouble?": "number",
  "asInt?": "string",
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
  timeUnixNano: "string",
  "observedTimeUnixNano?": "string",
  "severityNumber?": "number",
  "severityText?": "string",
  "body?": AnyValue,
  "attributes?": KeyValue.array(),
  "droppedAttributesCount?": "number",
  "flags?": "number",
  "traceId?": "string",
  "spanId?": "string",
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
