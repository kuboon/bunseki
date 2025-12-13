import { merge } from "lume/core/utils/object.ts";
import { log, warnUntil } from "lume/core/utils/log.ts";
import type Site from "lume/core/site.ts";

import { join } from "@std/path";

export interface Options {
  srcEntrypoints?: string[];
  destEntrypoints?: string[];

  /**
   * The options for Deno.bundle
   * @see https://docs.deno.com/api/deno/~/Deno.bundle.Options
   */
  options?: Partial<Deno.bundle.Options>;
}

// Default options
export const defaults: Options = {
  srcEntrypoints: [],
  destEntrypoints: [],
  options: {
    format: "esm",
    minify: true,
    platform: "browser",
  },
};

/**
 * A plugin to use Deno.bundle in Lume
 */
export function bundle(userOptions?: Options) {
  const options = merge(defaults, userOptions);

  return (site: Site) => {
    const srcPath = site.src();
    const outputPath = site.dest();
    const outputDir = site.options.location.pathname;
    const entrypoints = [
      ...options.srcEntrypoints.map((x) => join(srcPath, x)),
      ...options.destEntrypoints.map((x) => join(outputPath, x)),
    ];

    site.addEventListener("afterBuild", async () => {
      const hasPages = warnUntil(
        `[bundle plugin] "entrypoints" is empty.`,
        entrypoints.length,
      );

      if (!hasPages) return;

      const buildOptions: Deno.bundle.Options = {
        ...options.options,
        entrypoints,
        outputPath,
        outputDir,
      };
      const { warnings, errors } = await Deno.bundle(buildOptions)
        .catch((error) => {
          log.error(`[bundle plugin] Error during bundling: ${error.message}`);
          return { warnings: [], errors: [] };
        });
      if (warnings.length) {
        log.warn(
          `[bundle plugin] ${warnings.length} warnings`,
        );
      }
      if (errors.length) {
        log.error(`[bundle plugin] ${errors.length} errors `);
        log.error(errors.map((x) => x.text).join("\n"));
      }

      site.debugBar?.buildItem(
        "[bundle plugin] Build completed",
      );
    });
  };
}

export default bundle;
