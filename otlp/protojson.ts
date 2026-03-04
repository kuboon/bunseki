export const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

export const hexToBytes = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

export const bytesToBase64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes));

export const base64ToBytes = (base64: string) => {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0)!);
};

export type AttributeValue =
  | { stringValue: string }
  | { intValue: string }
  | { doubleValue: number }
  | { boolValue: boolean }
  | { bytesValue: string }
  | { arrayValue: { values: AttributeValue[] } }
  | { kvlistValue: { values: Array<{ key: string; value: AttributeValue }> } }
  | { nullValue: null };

export type AttributePrimitive =
  | string
  | number
  | boolean
  | bigint
  | null
  | Uint8Array
  | AttributeObject
  | Array<AttributePrimitive>;

export type AttributeObject = {
  [key: string]: AttributePrimitive;
};

export function toAttributeValue(value: AttributePrimitive): AttributeValue {
  if (value === null) {
    return { nullValue: null };
  }

  switch (typeof value) {
    case "string":
      return { stringValue: value };
    case "number":
      if (Number.isInteger(value)) {
        return { intValue: value.toString() };
      } else {
        return { doubleValue: value };
      }
    case "bigint":
      return { intValue: value.toString() };
    case "boolean":
      return { boolValue: value };
    case "object":
      if (value instanceof Uint8Array) {
        // https://protobuf.dev/programming-guides/json/#bytes
        // bytes fields are encoded as base64 strings
        return { bytesValue: bytesToBase64(value) };
      } else if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(toAttributeValue) } };
      } else if (Object.getPrototypeOf(value) === Object.prototype) {
        return {
          kvlistValue: {
            values: Object.entries(value).map(([key, item]) =>
              toKeyValue(key, item)
            ),
          },
        };
      } else {
        throw new Error(
          "Unsupported attribute value type: " + typeof value,
        );
      }
    default:
      throw new Error("Unsupported attribute value type: " + typeof value);
  }
}

export function toKeyValue(key: string, value: AttributePrimitive) {
  return { key, value: toAttributeValue(value) };
}

export function toAttributes(attrs: Record<string, AttributePrimitive>) {
  return Object.entries(attrs).map(([key, value]) => toKeyValue(key, value));
}

export function toUnixNano(timeMs: number): string {
  return String(BigInt(timeMs) * BigInt(1e6));
}
