let dateNow = () => Date.now();
export function _setNow(fn: () => number) {
  dateNow = fn;
}
export { dateNow };

type ParsedTraceparent = {
  traceId: string | undefined;
  parentSpanId: string | undefined;
};

const EMPTY_TRACEPARENT: ParsedTraceparent = {
  traceId: undefined,
  parentSpanId: undefined,
};

const TRACEPARENT_REGEX =
  /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

export function parseTraceparent(value: string | null): ParsedTraceparent {
  if (!value) return EMPTY_TRACEPARENT;

  const match = value.trim().match(TRACEPARENT_REGEX);
  if (!match) return EMPTY_TRACEPARENT;

  const [, version, traceId, parentSpanId] = match;
  if (version.toLowerCase() === "ff") return EMPTY_TRACEPARENT;
  if (/^0+$/i.test(traceId)) return EMPTY_TRACEPARENT;
  if (/^0+$/i.test(parentSpanId)) return EMPTY_TRACEPARENT;

  return {
    traceId: traceId.toLowerCase(),
    parentSpanId: parentSpanId.toLowerCase(),
  };
}
