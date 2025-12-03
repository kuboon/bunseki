import type { AllowedDomain, BrowserEvent, DailyStats, ErrorEvent, ServerEvent } from "./types.ts";

const kv = await Deno.openKv();

// Data retention configuration
const RETENTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Keys structure:
// ["events", "browser", domain, timestamp] -> BrowserEvent
// ["events", "server", domain, timestamp] -> ServerEvent
// ["events", "error", domain, timestamp] -> ErrorEvent
// ["stats", "daily", domain, date] -> DailyStats
// ["keys", domain] -> string (signing key)

export async function saveBrowserEvent(event: BrowserEvent): Promise<void> {
  const key = ["events", "browser", event.domain, event.timestamp];
  await kv.set(key, event);
}

export async function saveServerEvent(event: ServerEvent): Promise<void> {
  const key = ["events", "server", event.domain, event.timestamp];
  await kv.set(key, event);
}

export async function saveErrorEvent(event: ErrorEvent): Promise<void> {
  const key = ["events", "error", event.domain, event.timestamp];
  await kv.set(key, event);
}

export async function getDailyStats(
  domain: AllowedDomain,
  date: string,
): Promise<DailyStats | null> {
  const key = ["stats", "daily", domain, date];
  const result = await kv.get<DailyStats>(key);
  return result.value;
}

export async function saveDailyStats(stats: DailyStats): Promise<void> {
  const key = ["stats", "daily", stats.domain, stats.date];
  await kv.set(key, stats);
}

export async function getOrCreateSigningKey(domain: AllowedDomain): Promise<string> {
  const key = ["keys", domain];
  const result = await kv.get<string>(key);
  
  if (result.value) {
    return result.value;
  }
  
  // Generate new key
  const keyData = new Uint8Array(32);
  crypto.getRandomValues(keyData);
  const signingKey = Array.from(keyData)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  
  await kv.set(key, signingKey);
  return signingKey;
}

export async function getSigningKey(domain: AllowedDomain): Promise<string | null> {
  const key = ["keys", domain];
  const result = await kv.get<string>(key);
  return result.value;
}

// Aggregate old data and clean up
export async function aggregateAndCleanup(domain: AllowedDomain): Promise<void> {
  const oneMonthAgo = Date.now() - RETENTION_PERIOD_MS;
  const sessionsByDate = new Map<string, Set<string>>();
  
  // Aggregate browser events
  const browserEvents: BrowserEvent[] = [];
  const browserIter = kv.list<BrowserEvent>({ prefix: ["events", "browser", domain] });
  for await (const entry of browserIter) {
    if (entry.value.timestamp < oneMonthAgo) {
      browserEvents.push(entry.value);
      if (entry.value.sessionId) {
        const date = new Date(entry.value.timestamp).toISOString().split("T")[0];
        if (!sessionsByDate.has(date)) {
          sessionsByDate.set(date, new Set());
        }
        sessionsByDate.get(date)!.add(entry.value.sessionId);
      }
    }
  }
  
  // Aggregate server events
  const serverEvents: ServerEvent[] = [];
  const serverIter = kv.list<ServerEvent>({ prefix: ["events", "server", domain] });
  for await (const entry of serverIter) {
    if (entry.value.timestamp < oneMonthAgo) {
      serverEvents.push(entry.value);
    }
  }
  
  // Aggregate error events
  const errorEvents: ErrorEvent[] = [];
  const errorIter = kv.list<ErrorEvent>({ prefix: ["events", "error", domain] });
  for await (const entry of errorIter) {
    if (entry.value.timestamp < oneMonthAgo) {
      errorEvents.push(entry.value);
    }
  }
  
  // Group by date and aggregate
  const statsByDate = new Map<string, DailyStats>();
  
  for (const event of browserEvents) {
    const date = new Date(event.timestamp).toISOString().split("T")[0];
    if (!statsByDate.has(date)) {
      statsByDate.set(date, {
        domain,
        date,
        pageViews: 0,
        uniqueSessions: 0,
        errors: 0,
        serverRequests: 0,
        avgDuration: 0,
      });
    }
    const stats = statsByDate.get(date)!;
    stats.pageViews++;
  }
  
  for (const event of serverEvents) {
    const date = new Date(event.timestamp).toISOString().split("T")[0];
    if (!statsByDate.has(date)) {
      statsByDate.set(date, {
        domain,
        date,
        pageViews: 0,
        uniqueSessions: 0,
        errors: 0,
        serverRequests: 0,
        avgDuration: 0,
      });
    }
    const stats = statsByDate.get(date)!;
    const oldCount = stats.serverRequests;
    stats.serverRequests++;
    // Calculate running average properly
    stats.avgDuration = (stats.avgDuration * oldCount + event.duration) / stats.serverRequests;
  }
  
  for (const event of errorEvents) {
    const date = new Date(event.timestamp).toISOString().split("T")[0];
    if (!statsByDate.has(date)) {
      statsByDate.set(date, {
        domain,
        date,
        pageViews: 0,
        uniqueSessions: 0,
        errors: 0,
        serverRequests: 0,
        avgDuration: 0,
      });
    }
    const stats = statsByDate.get(date)!;
    stats.errors++;
  }
  
  // Update unique sessions count per date
  statsByDate.forEach((stats) => {
    const sessionsForDate = sessionsByDate.get(stats.date);
    stats.uniqueSessions = sessionsForDate ? sessionsForDate.size : 0;
  });
  
  // Save aggregated stats
  for (const stats of statsByDate.values()) {
    await saveDailyStats(stats);
  }
  
  // Delete old raw events
  for (const event of browserEvents) {
    await kv.delete(["events", "browser", domain, event.timestamp]);
  }
  for (const event of serverEvents) {
    await kv.delete(["events", "server", domain, event.timestamp]);
  }
  for (const event of errorEvents) {
    await kv.delete(["events", "error", domain, event.timestamp]);
  }
}

export { kv };
