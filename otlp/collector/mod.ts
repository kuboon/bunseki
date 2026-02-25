import { createCollectorRouter } from "./router.ts";

export * from "./storage/types.ts";
export type AppType = ReturnType<typeof createCollectorRouter>;
export { createCollectorRouter };
