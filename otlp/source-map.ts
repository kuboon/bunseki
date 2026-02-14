import { SourceMapConsumer } from "npm:source-map@0.7.4";

/**
 * Resolves a stack trace using source maps found at the URLs in the stack frames.
 * @param stacktrace The original stack trace lines.
 * @returns The stack trace with source mapped locations, or the original lines if mapping fails.
 */
export async function resolveStacktrace(
  stacktrace: string[],
): Promise<string[]> {
  // 1. Identify unique URLs
  const urls = new Set<string>();
  const frames: {
    lineIdx: number;
    url: string;
    line: number;
    col: number;
    func: string | undefined;
    originalLine: string;
  }[] = [];

  // Regex to parse Chrome/V8 style stack traces
  // Matches: "at functionName (url:line:col)" or "at url:line:col"
  const re = /at (?:(.+?)\s+\()?(https?:\/\/[^)]+):(\d+):(\d+)\)?/;

  stacktrace.forEach((line, idx) => {
    const match = line.match(re);
    if (match) {
      const [_, func, url, l, c] = match;
      urls.add(url);
      frames.push({
        lineIdx: idx,
        url,
        line: parseInt(l, 10),
        col: parseInt(c, 10),
        func,
        originalLine: line,
      });
    }
  });

  if (urls.size === 0) return stacktrace;

  // 2. Fetch maps and create consumers
  const consumers = new Map<string, SourceMapConsumer>();

  await Promise.all(
    Array.from(urls).map(async (url) => {
      try {
        // First, try to fetch the JS file to find the correct source mapping URL
        const jsRes = await fetch(url);
        if (!jsRes.ok) return; // Skip if JS file not found (or private)
        const jsContent = await jsRes.text();

        // Look for //# sourceMappingURL=... or //@ sourceMappingURL=...
        // We look for the last occurrence
        const mapUrlMatch = jsContent.match(
          /\/\/[#@]\s*sourceMappingURL=(.+?)\s*$/,
        );
        let mapUrl: string;

        if (mapUrlMatch) {
          // Resolve relative URL
          mapUrl = new URL(mapUrlMatch[1], url).toString();
        } else {
          // Fallback: assume .map extension
          mapUrl = url + ".map";
        }

        const mapRes = await fetch(mapUrl);
        if (!mapRes.ok) return;
        const mapJson = await mapRes.json();

        // @ts-ignore: SourceMapConsumer constructor returns a Promise in 0.7.x
        const consumer = await new SourceMapConsumer(mapJson);
        consumers.set(url, consumer);
      } catch (_e) {
        // Fail silently for this URL, just log to debug if needed
        // console.warn(`Error loading source map for ${url}:`, e);
      }
    }),
  );

  // 3. Map lines
  const newStack = [...stacktrace];

  for (const frame of frames) {
    const consumer = consumers.get(frame.url);
    if (consumer) {
      try {
        const original = consumer.originalPositionFor({
          line: frame.line,
          column: frame.col,
        });

        if (original.source && original.line !== null) {
          // Reconstruct line
          // Format: at functionName (source:line:col)
          // Use original.name if available, else fallback to original function name
          const name = original.name || frame.func || "";
          // source is usually a relative path from the map, or an absolute path
          // We'll use it as is for now.
          const source = original.source;

          // If there is a name, include it.
          const prefix = name ? `at ${name} (` : "at ";
          const suffix = name ? ")" : "";

          newStack[frame.lineIdx] =
            `    ${prefix}${source}:${original.line}:${original.column}${suffix}`;
        }
      } catch (_e) {
        // Ignore mapping errors for specific frames
      }
    }
  }

  // 4. Cleanup
  for (const consumer of consumers.values()) {
    consumer.destroy();
  }

  return newStack;
}
