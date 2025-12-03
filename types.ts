// Domain configuration
export const ALLOWED_DOMAINS = ["o.kbn.one", "dd2030.org"] as const;
export type AllowedDomain = typeof ALLOWED_DOMAINS[number];

// Analytics event types
export interface BrowserEvent {
  domain: AllowedDomain;
  timestamp: number;
  url: string;
  referrer?: string;
  userAgent?: string;
  screenResolution?: string;
  language?: string;
  sessionId?: string;
}

export interface ServerEvent {
  domain: AllowedDomain;
  timestamp: number;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  ip?: string;
}

export interface ErrorEvent {
  domain: AllowedDomain;
  timestamp: number;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  type: "browser" | "server";
}

// Daily aggregate statistics
export interface DailyStats {
  domain: AllowedDomain;
  date: string; // YYYY-MM-DD
  pageViews: number;
  uniqueSessions: number;
  errors: number;
  serverRequests: number;
  avgDuration: number;
}
