import type { AppType } from "../collector/mod.ts";
import { hc } from "@hono/hono/client";

let dateNow = () => Date.now();
export function _setNow(fn: () => number) {
  dateNow = fn;
}
export { dateNow };

export interface ExporterConfig {
  serviceName: string;
  scope: { name: string; version: string };
  client: ReturnType<typeof hc<AppType>>;
}
