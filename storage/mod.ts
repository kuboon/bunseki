// Storage layer for OTLP telemetry data using Deno KV

import type { SpanType } from "../otlp/schemas.ts";

// Initialize Deno KV
let kv: Deno.Kv;

export async function initStorage() {
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
}

export function getKv() {
  if (!kv) {
    throw new Error("Storage not initialized. Call initStorage() first.");
  }
  return kv;
}

// === Type Definitions ===

export interface PageViewCount {
  count: number;
  lastUpdated: number;
}

export interface ErrorRecord {
  errorHash: string;
  type: string;
  message: string;
  stacktrace: string[];
  count: number;
  firstSeen: number;
  lastSeen: number;
  serviceName: string;
  spans: string[]; // Array of spanIds with this error
}

export interface SpanRecord {
  spanId: string;
  traceId: string;
  serviceName: string;
  timestamp: number;
  data: SpanType;
}

export interface ServiceInfo {
  name: string;
  firstSeen: number;
  lastSeen: number;
}

// === Key Patterns ===

export const keys = {
  services: () => ["services"] as const,
  serviceInfo: (name: string) => [name, "info"] as const,
  counter: (
    serviceName: string,
    counterName: string,
    dateISO: string,
    key: string,
  ) => [serviceName, "counters", counterName, dateISO, key] as const,
  counterByDate: (serviceName: string, counterName: string, dateISO: string) =>
    [serviceName, "counters", counterName, dateISO] as const,
  span: (serviceName: string, timestamp: number, spanId: string) =>
    [serviceName, "spans", timestamp, spanId] as const,
  spansByService: (serviceName: string) => [serviceName, "spans"] as const,
  error: (serviceName: string, errorHash: string) =>
    [serviceName, "errors", errorHash] as const,
  errorByTime: (serviceName: string, timestamp: number) =>
    [serviceName, "errors_by_time", timestamp] as const,
  errorsByTimePrefix: (serviceName: string) =>
    [serviceName, "errors_by_time"] as const,
};

// === Helper Functions ===

function getDateISO(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0];
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// === Service Management ===

export async function registerService(serviceName: string) {
  const kv = getKv();
  const now = Date.now();

  // Add to services set
  const servicesKey = keys.services();
  const services = await kv.get<string[]>(servicesKey);
  const serviceSet = new Set(services.value || []);
  serviceSet.add(serviceName);
  await kv.set(servicesKey, Array.from(serviceSet));

  // Update service info
  const infoKey = keys.serviceInfo(serviceName);
  const info = await kv.get<ServiceInfo>(infoKey);
  if (info.value) {
    await kv.set(infoKey, {
      ...info.value,
      lastSeen: now,
    });
  } else {
    await kv.set(infoKey, {
      name: serviceName,
      firstSeen: now,
      lastSeen: now,
    });
  }
}

export async function listServices(): Promise<ServiceInfo[]> {
  const kv = getKv();
  const servicesKey = keys.services();
  const services = await kv.get<string[]>(servicesKey);

  if (!services.value) {
    return [];
  }

  const infos: ServiceInfo[] = [];
  for (const name of services.value) {
    const info = await kv.get<ServiceInfo>(keys.serviceInfo(name));
    if (info.value) {
      infos.push(info.value);
    }
  }

  return infos.sort((a, b) => b.lastSeen - a.lastSeen);
}

// === Page View (Metrics) Storage ===

export async function incrementCounter(
  serviceName: string,
  counterName: string,
  keyName: string,
  timestamp: number,
  count = 1,
) {
  const kv = getKv();
  await registerService(serviceName);

  const dateISO = getDateISO(timestamp);
  const key = keys.counter(serviceName, counterName, dateISO, keyName);

  let committed = false;
  while (!committed) {
    const existing = await kv.get<PageViewCount>(key);
    const newCount: PageViewCount = {
      count: (existing.value?.count || 0) + count,
      lastUpdated: timestamp,
    };

    const res = await kv.atomic()
      .check(existing)
      .set(key, newCount)
      .commit();

    committed = res.ok;
  }
}

export async function getPageViews(
  serviceName: string,
  startDate: string,
  endDate: string,
): Promise<Map<string, Map<string, number>>> {
  const kv = getKv();
  const result = new Map<string, Map<string, number>>(); // date -> path -> count

  // Iterate through date range
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (
    const d = new Date(start);
    d <= end;
    d.setDate(d.getDate() + 1)
  ) {
    const dateISO = d.toISOString().split("T")[0];
    const prefix = keys.counterByDate(serviceName, "page_views", dateISO);
    const entries = kv.list<PageViewCount>({ prefix });

    const pathCounts = new Map<string, number>();
    for await (const entry of entries) {
      const path = entry.key[4] as string;
      pathCounts.set(path, entry.value.count);
    }

    if (pathCounts.size > 0) {
      result.set(dateISO, pathCounts);
    }
  }

  return result;
}

export async function getTotalPageViewsByDate(
  serviceName: string,
  startDate: string,
  endDate: string,
): Promise<Map<string, number>> {
  const pageViews = await getPageViews(serviceName, startDate, endDate);
  const totals = new Map<string, number>();

  for (const [date, pathCounts] of pageViews) {
    const total = Array.from(pathCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    totals.set(date, total);
  }

  return totals;
}

// === Span (Trace) Storage ===

const SPAN_RETENTION_DAYS = 30;

export async function storeSpan(
  serviceName: string,
  span: SpanType,
) {
  const kv = getKv();
  await registerService(serviceName);

  // Parse timestamp from nanoseconds
  const timestamp = Math.floor(
    parseInt(span.startTimeUnixNano) / 1_000_000,
  );

  const record: SpanRecord = {
    spanId: span.spanId,
    traceId: span.traceId,
    serviceName,
    timestamp,
    data: span,
  };

  const key = keys.span(serviceName, timestamp, span.spanId);

  // Set with expiration (30 days)
  const expiresIn = SPAN_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  await kv.set(key, record, { expireIn: expiresIn });
}

export async function getSpan(
  serviceName: string,
  timestamp: number,
  spanId: string,
): Promise<SpanRecord | null> {
  const kv = getKv();
  const key = keys.span(serviceName, timestamp, spanId);
  const result = await kv.get<SpanRecord>(key);
  return result.value;
}

export async function getRecentSpans(
  serviceName: string,
  limit = 100,
): Promise<SpanRecord[]> {
  const kv = getKv();
  const prefix = keys.spansByService(serviceName);
  const entries = kv.list<SpanRecord>({ prefix }, { reverse: true });

  const spans: SpanRecord[] = [];
  let count = 0;
  for await (const entry of entries) {
    if (count >= limit) break;
    spans.push(entry.value);
    count++;
  }

  return spans;
}

// === Error Storage ===

export async function storeError(
  serviceName: string,
  span: SpanType,
  exceptionEvent: {
    type: string;
    message: string;
    stacktrace: string[];
  },
) {
  const kv = getKv();
  await registerService(serviceName);

  // Generate error hash from type + message + first line of stack
  const stackFirst = exceptionEvent.stacktrace[0] || "";
  const hashInput =
    `${exceptionEvent.type}:${exceptionEvent.message}:${stackFirst}`;
  const errorHash = await hashString(hashInput);

  const timestamp = Math.floor(
    parseInt(span.startTimeUnixNano) / 1_000_000,
  );

  const errorKey = keys.error(serviceName, errorHash);
  const existing = await kv.get<ErrorRecord>(errorKey);

  let errorRecord: ErrorRecord;
  if (existing.value) {
    errorRecord = {
      ...existing.value,
      count: existing.value.count + 1,
      lastSeen: timestamp,
      spans: [...existing.value.spans, span.spanId].slice(-10), // Keep last 10 span IDs
    };
  } else {
    errorRecord = {
      errorHash,
      type: exceptionEvent.type,
      message: exceptionEvent.message,
      stacktrace: exceptionEvent.stacktrace,
      count: 1,
      firstSeen: timestamp,
      lastSeen: timestamp,
      serviceName,
      spans: [span.spanId],
    };
  }

  await kv.set(errorKey, errorRecord);

  // Index by time for recent errors query
  const timeKey = keys.errorByTime(serviceName, timestamp);
  await kv.set(timeKey, errorHash);

  // Cleanup old errors (keep last 50)
  await cleanupOldErrors(serviceName);
}

async function cleanupOldErrors(serviceName: string, keepCount = 50) {
  const kv = getKv();

  // Get all errors by time
  const prefix = keys.errorsByTimePrefix(serviceName);
  const entries = kv.list<string>({ prefix }, { reverse: true });

  const hashes: string[] = [];
  for await (const entry of entries) {
    hashes.push(entry.value);
  }

  // Remove duplicates (keep unique error hashes)
  const uniqueHashes = Array.from(new Set(hashes));

  // Delete old errors beyond keepCount
  if (uniqueHashes.length > keepCount) {
    const toDelete = uniqueHashes.slice(keepCount);
    for (const hash of toDelete) {
      await kv.delete(keys.error(serviceName, hash));
    }
  }
}

export async function getRecentErrors(
  serviceName: string,
  limit = 10,
): Promise<ErrorRecord[]> {
  const kv = getKv();
  const prefix = keys.errorsByTimePrefix(serviceName);
  const entries = kv.list<string>({ prefix }, { reverse: true });

  const errors: ErrorRecord[] = [];
  const seenHashes = new Set<string>();
  let count = 0;

  for await (const entry of entries) {
    if (count >= limit * 3) break; // Get more to account for duplicates
    count++;

    const errorHash = entry.value;
    if (seenHashes.has(errorHash)) continue;
    seenHashes.add(errorHash);

    const errorKey = keys.error(serviceName, errorHash);
    const errorRecord = await kv.get<ErrorRecord>(errorKey);
    if (errorRecord.value) {
      errors.push(errorRecord.value);
    }

    if (errors.length >= limit) break;
  }

  return errors;
}

export async function getError(
  serviceName: string,
  errorHash: string,
): Promise<ErrorRecord | null> {
  const kv = getKv();
  const key = keys.error(serviceName, errorHash);
  const result = await kv.get<ErrorRecord>(key);
  return result.value;
}

// === Utility: Get Dashboard Data ===

export interface DashboardData {
  services: ServiceInfo[];
  serviceDashboards: Map<string, ServiceDashboard>;
}

export interface ServiceDashboard {
  service: ServiceInfo;
  pvData: Map<string, number>; // date -> total count
  recentErrors: ErrorRecord[];
}

export async function getDashboardData(
  daysBack = 30,
): Promise<DashboardData> {
  const services = await listServices();
  const serviceDashboards = new Map<string, ServiceDashboard>();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const startISO = startDate.toISOString().split("T")[0];
  const endISO = endDate.toISOString().split("T")[0];

  for (const service of services) {
    const pvData = await getTotalPageViewsByDate(
      service.name,
      startISO,
      endISO,
    );
    const recentErrors = await getRecentErrors(service.name, 10);

    serviceDashboards.set(service.name, {
      service,
      pvData,
      recentErrors,
    });
  }

  return {
    services,
    serviceDashboards,
  };
}
