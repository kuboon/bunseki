import { type } from "arktype";

// OTLP/HTTP Validation Schemas

// Attribute value type
const AttributeValue = type({
  "stringValue?": "string",
  "intValue?": "string",
  "doubleValue?": "number",
  "boolValue?": "boolean",
  "bytesValue?": "string",
});

// Span attribute
const SpanAttribute = type({
  key: "string",
  value: AttributeValue,
});

// Span event
const SpanEvent = type({
  name: "string",
  timeUnixNano: "string",
  "attributes?": SpanAttribute.array(),
  "droppedAttributesCount?": "number",
});

// Span link
const SpanLink = type({
  traceId: "string",
  spanId: "string",
  "traceState?": "string",
  "attributes?": SpanAttribute.array(),
  "droppedAttributesCount?": "number",
});

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
  "attributes?": SpanAttribute.array(),
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

// Span scope spans
const ScopeSpans = type({
  "scope?": {
    name: "string",
    "version?": "string",
    "attributes?": SpanAttribute.array(),
  },
  spans: Span.array(),
  "schemaUrl?": "string",
});

// Resource spans
const ResourceSpans = type({
  "resource?": {
    attributes: SpanAttribute.array(),
    "droppedAttributesCount?": "number",
  },
  scopeSpans: ScopeSpans.array(),
  "schemaUrl?": "string",
});

// Traces request schema
export const tracesRequestSchema = type({
  resourceSpans: ResourceSpans.array(),
});
export type TracesRequest = typeof tracesRequestSchema.infer;

// Metric attribute
const MetricAttribute = type({
  key: "string",
  value: {
    "stringValue?": "string",
    "intValue?": "string",
    "doubleValue?": "number",
    "boolValue?": "boolean",
  },
});

// Number data point
const NumberDataPoint = type({
  "attributes?": MetricAttribute.array(),
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
    "attributes?": MetricAttribute.array(),
  },
  metrics: Metric.array(),
  "schemaUrl?": "string",
});

// Resource metrics
const ResourceMetrics = type({
  "resource?": {
    attributes: MetricAttribute.array(),
    "droppedAttributesCount?": "number",
  },
  scopeMetrics: ScopeMetrics.array(),
  "schemaUrl?": "string",
});

// Metrics request schema
export const metricsRequestSchema = type({
  resourceMetrics: ResourceMetrics.array(),
});
export type MetricsRequest = typeof metricsRequestSchema.infer;

// Log record
const LogRecord = type({
  timeUnixNano: "string",
  "observedTimeUnixNano?": "string",
  "severityNumber?": "number",
  "severityText?": "string",
  "body?": {
    "stringValue?": "string",
    "intValue?": "string",
    "doubleValue?": "number",
    "boolValue?": "boolean",
    "bytesValue?": "string",
  },
  "attributes?": SpanAttribute.array(),
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
    "attributes?": SpanAttribute.array(),
  },
  logRecords: LogRecord.array(),
  "schemaUrl?": "string",
});

// Resource logs
const ResourceLogs = type({
  "resource?": {
    attributes: SpanAttribute.array(),
    "droppedAttributesCount?": "number",
  },
  scopeLogs: ScopeLogRecords.array(),
  "schemaUrl?": "string",
});

// Logs request schema
export const logsRequestSchema = type({
  resourceLogs: ResourceLogs.array(),
});
export type LogsRequest = typeof logsRequestSchema.infer;
