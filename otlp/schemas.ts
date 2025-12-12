import { scope, type } from "arktype";

// OTLP/HTTP Validation Schemas

// Attribute value type
const AttributeValueScope = scope({
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
const AttributeValue = AttributeValueScope.export().AttributeValue;

export const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

type AttributePrimitive =
  | string
  | number
  | boolean
  | Uint8Array
  | Array<AttributePrimitive>;
export function attrValue(
  value: AttributePrimitive,
): typeof AttributeValue.infer {
  switch (typeof value) {
    case "string":
      return { stringValue: value };
    case "number":
      if (Number.isInteger(value)) {
        return { intValue: value.toString() };
      } else {
        return { doubleValue: value };
      }
    case "boolean":
      return { boolValue: value };
    case "object":
      if (value instanceof Uint8Array) {
        return { bytesValue: bytesToHex(value) };
      } else if (Array.isArray(value)) {
        return { arrayValue: { values: value.map((v) => attrValue(v)) } };
      } else throw new Error("Unsupported attribute value type");
    default:
      throw new Error("Unsupported attribute value type");
  }
}

// Span attribute
const SpanAttribute = type({
  key: "string",
  value: AttributeValue,
});

export function spanAttr(
  key: string,
  value: Parameters<typeof attrValue>[0],
): typeof SpanAttribute.infer {
  return { key, value: attrValue(value) };
}

// Span event
const SpanEvent = type({
  name: "string",
  timeUnixNano: "string",
  "attributes?": SpanAttribute.array(),
  "droppedAttributesCount?": "number",
});
export type SpanEventType = typeof SpanEvent.infer;

// Span link
const SpanLink = type({
  traceId: "string",
  spanId: "string",
  "traceState?": "string",
  "attributes?": SpanAttribute.array(),
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
export type SpanType = typeof Span.infer;

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
