import type {
  AllowedDomain,
  BrowserEvent,
  DailyStats,
  ErrorEvent,
  ServerEvent,
} from "./types.ts";

const kv = await Deno.openKv();

// Data retention configuration
const RETENTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Keys structure:
// [domain, "events", "browser", timestamp] -> BrowserEvent
// [domain, "events", "server", timestamp] -> ServerEvent
// [domain, "events", "error", timestamp] -> ErrorEvent
// [domain, "stats", "daily", date] -> DailyStats
// [domain, "sessions", date, sessionId] -> true (for tracking unique sessions)
// [domain, "keys"] -> string (signing key)

export async function saveBrowserEvent(event: BrowserEvent): Promise<void> {
  const key = [event.domain, "events", "browser", event.timestamp];
  await kv.set(key, event);

  // Also track session for the day if sessionId is provided
  if (event.sessionId) {
    const date = new Date(event.timestamp).toISOString().split("T")[0];
    const sessionKey = [event.domain, "sessions", date, event.sessionId];
    await kv.set(sessionKey, true);
  }
}

export async function saveServerEvent(event: ServerEvent): Promise<void> {
  const key = [event.domain, "events", "server", event.timestamp];
  await kv.set(key, event);
}

export async function saveErrorEvent(event: ErrorEvent): Promise<void> {
  const key = [event.domain, "events", "error", event.timestamp];
  await kv.set(key, event);
}

export async function getDailyStats(
  domain: AllowedDomain,
  date: string,
): Promise<DailyStats | null> {
  const key = [domain, "stats", "daily", date];
  const result = await kv.get<DailyStats>(key);
  return result.value;
}

export async function saveDailyStats(stats: DailyStats): Promise<void> {
  const key = [stats.domain, "stats", "daily", stats.date];
  await kv.set(key, stats);
}

export async function getOrCreateSigningKey(
  domain: AllowedDomain,
): Promise<string> {
  const key = [domain, "keys"];
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

export async function getSigningKey(
  domain: AllowedDomain,
): Promise<string | null> {
  const key = [domain, "keys"];
  const result = await kv.get<string>(key);
  return result.value;
}

// Aggregate old data and clean up
export async function aggregateAndCleanup(
  domain: AllowedDomain,
): Promise<void> {
  const oneMonthAgo = Date.now() - RETENTION_PERIOD_MS;

  // Aggregate browser events
  const browserEvents: BrowserEvent[] = [];
  const browserIter = kv.list<BrowserEvent>({
    prefix: [domain, "events", "browser"],
  });
  for await (const entry of browserIter) {
    if (entry.value.timestamp < oneMonthAgo) {
      browserEvents.push(entry.value);
    }
  }

  // Aggregate server events
  const serverEvents: ServerEvent[] = [];
  const serverIter = kv.list<ServerEvent>({
    prefix: [domain, "events", "server"],
  });
  for await (const entry of serverIter) {
    if (entry.value.timestamp < oneMonthAgo) {
      serverEvents.push(entry.value);
    }
  }

  // Aggregate error events
  const errorEvents: ErrorEvent[] = [];
  const errorIter = kv.list<ErrorEvent>({
    prefix: [domain, "events", "error"],
  });
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
    stats.avgDuration = ((stats.avgDuration || 0) * oldCount + event.duration) /
      stats.serverRequests;
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

  // Update unique sessions count per date (count from permanent session store)
  for (const [date, stats] of statsByDate.entries()) {
    let sessionCount = 0;
    const sessionIter = kv.list({ prefix: [domain, "sessions", date] });
    for await (const _ of sessionIter) {
      sessionCount++;
    }
    stats.uniqueSessions = sessionCount;
  }

  // Save aggregated stats (merge with existing if present)
  for (const stats of statsByDate.values()) {
    const existing = await getDailyStats(stats.domain, stats.date);
    if (existing) {
      // Merge with existing stats
      existing.pageViews += stats.pageViews;
      existing.errors += stats.errors;

      // Unique sessions are counted from the permanent session store
      existing.uniqueSessions = stats.uniqueSessions;

      // Merge server requests and recalculate average duration
      const totalDuration = (existing.avgDuration * existing.serverRequests) +
        (stats.avgDuration * stats.serverRequests);
      existing.serverRequests += stats.serverRequests;
      existing.avgDuration = existing.serverRequests > 0
        ? totalDuration / existing.serverRequests
        : 0;

      await saveDailyStats(existing);
    } else {
      await saveDailyStats(stats);
    }
  }

  // Delete old raw events
  for (const event of browserEvents) {
    await kv.delete([domain, "events", "browser", event.timestamp]);
  }
  for (const event of serverEvents) {
    await kv.delete([domain, "events", "server", event.timestamp]);
  }
  for (const event of errorEvents) {
    await kv.delete([domain, "events", "error", event.timestamp]);
  }
}

// Get recent browser events
export async function getRecentBrowserEvents(
  domain: AllowedDomain,
  limit = 100,
): Promise<BrowserEvent[]> {
  const events: BrowserEvent[] = [];
  const iter = kv.list<BrowserEvent>({
    prefix: [domain, "events", "browser"],
    reverse: true,
  });

  let count = 0;
  for await (const entry of iter) {
    if (count >= limit) break;
    events.push(entry.value);
    count++;
  }

  return events;
}

// Get recent server events
export async function getRecentServerEvents(
  domain: AllowedDomain,
  limit = 100,
): Promise<ServerEvent[]> {
  const events: ServerEvent[] = [];
  const iter = kv.list<ServerEvent>({
    prefix: [domain, "events", "server"],
    reverse: true,
  });

  let count = 0;
  for await (const entry of iter) {
    if (count >= limit) break;
    events.push(entry.value);
    count++;
  }

  return events;
}

// Get recent error events
export async function getRecentErrorEvents(
  domain: AllowedDomain,
  limit = 100,
): Promise<ErrorEvent[]> {
  const events: ErrorEvent[] = [];
  const iter = kv.list<ErrorEvent>({
    prefix: [domain, "events", "error"],
    reverse: true,
  });

  let count = 0;
  for await (const entry of iter) {
    if (count >= limit) break;
    events.push(entry.value);
    count++;
  }

  return events;
}

// Get daily stats for a date range
export async function getDailyStatsRange(
  domain: AllowedDomain,
  days = 30,
): Promise<DailyStats[]> {
  const stats: DailyStats[] = [];
  const iter = kv.list<DailyStats>({
    prefix: [domain, "stats", "daily"],
  });

  for await (const entry of iter) {
    stats.push(entry.value);
  }

  // Sort by date and limit to last N days
  stats.sort((a, b) => b.date.localeCompare(a.date));
  return stats.slice(0, days);
}

export { kv };
