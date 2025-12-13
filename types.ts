// Domain configuration
export const ALLOWED_DOMAINS = ["o.kbn.one", "dd2030.org"] as const;
export type AllowedDomain = typeof ALLOWED_DOMAINS[number];
