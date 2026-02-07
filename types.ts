// Domain configuration
export const ALLOWED_DOMAINS = [
  "kbn.one",
  "dd2030.org",
  "kuboon-tokyo.deno.net",
] as const;
export type AllowedDomain = typeof ALLOWED_DOMAINS[number];
