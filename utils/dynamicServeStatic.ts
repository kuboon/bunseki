import type { Context, Next } from "@hono/hono";
import { existsSync } from "@std/fs";
import { join, normalize } from "@std/path";

/**
 * Middleware to serve static files with automatic resolution of dynamic path parameters
 * like `:serviceName`, `:errorHash`, etc.
 *
 * Example: GET /dashboard/o.kbn.one/index.js
 *          -> Resolves to ./client/_site/dashboard/:serviceName/index.js
 *
 * @param options.root - Base directory for static files (e.g., "./client/_site")
 */
export function serveDynamicStatic(options: { root: string }) {
  return async (c: Context, next: Next) => {
    const requestPath = c.req.path;

    // Try to resolve the file path with dynamic parameters
    const resolvedFilePath = await resolvePathWithParams(
      options.root,
      requestPath,
    );

    if (resolvedFilePath) {
      // Security check: ensure the resolved path is within root
      const absoluteRoot = normalize(join(Deno.cwd(), options.root));
      const absoluteFile = normalize(join(Deno.cwd(), resolvedFilePath));

      if (!absoluteFile.startsWith(absoluteRoot)) {
        return c.text("Forbidden", 403);
      }

      try {
        // Read file content
        const content = await Deno.readFile(resolvedFilePath);

        // Determine content type
        const ext = resolvedFilePath.split(".").pop()?.toLowerCase();
        const contentType = getContentType(ext);

        return c.body(content, 200, {
          "Content-Type": contentType,
        });
      } catch (error) {
        console.error(`Error serving file ${resolvedFilePath}:`, error);
      }
    }

    // File not found, continue to next middleware
    await next();
  };
}

/**
 * Resolve a request path to an actual file path, trying dynamic parameter substitutions
 *
 * @param root - Base directory
 * @param requestPath - Request path (e.g., /dashboard/o.kbn.one/index.js)
 * @returns Resolved file path or null if not found
 */
async function resolvePathWithParams(
  root: string,
  requestPath: string,
): Promise<string | null> {
  // Remove leading slash and normalize
  let normalizedPath = requestPath.startsWith("/")
    ? requestPath.slice(1)
    : requestPath;

  // Remove trailing slash
  const endsWithSlash = normalizedPath.endsWith("/");
  if (endsWithSlash && normalizedPath.length > 1) {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  // If path is empty (root request), default to index.html
  if (normalizedPath === "" || normalizedPath === "/") {
    normalizedPath = "index.html";
  }

  // First, try the direct path
  const directPath = join(root, normalizedPath);
  if (existsSync(directPath)) {
    const stat = await Deno.stat(directPath);
    if (stat.isFile) {
      return directPath;
    }
    // If it's a directory, try index.html
    if (stat.isDirectory) {
      const indexPath = join(directPath, "index.html");
      if (existsSync(indexPath) && (await Deno.stat(indexPath)).isFile) {
        return indexPath;
      }
    }
  }

  // Split path into segments
  const segments = normalizedPath.split("/").filter(Boolean);

  // Try all combinations of replacing segments with :param directories
  const filePath = await findFileWithParams(root, segments, 0, endsWithSlash);
  return filePath;
}

/**
 * Recursively try to find a file by substituting path segments with :param directories
 */
async function findFileWithParams(
  currentDir: string,
  remainingSegments: string[],
  depth: number,
  endsWithSlash = false,
): Promise<string | null> {
  if (remainingSegments.length === 0) {
    // If no segments left, try to find index.html in current directory
    const indexPath = join(currentDir, "index.html");
    if (existsSync(indexPath) && (await Deno.stat(indexPath)).isFile) {
      return indexPath;
    }
    return null;
  }

  const [currentSegment, ...restSegments] = remainingSegments;

  // If this is the last segment, it could be a file or directory
  if (restSegments.length === 0) {
    // Try as a file first (unless it originally ended with /)
    if (!endsWithSlash) {
      const directFile = join(currentDir, currentSegment);
      if (existsSync(directFile)) {
        const stat = await Deno.stat(directFile);
        if (stat.isFile) {
          return directFile;
        }
      }
    }

    // Try as a directory - check both direct match and :param directories
    const directDir = join(currentDir, currentSegment);
    if (existsSync(directDir) && (await Deno.stat(directDir)).isDirectory) {
      const indexPath = join(directDir, "index.html");
      if (existsSync(indexPath) && (await Deno.stat(indexPath)).isFile) {
        return indexPath;
      }
    }

    // Try :param directories for the last segment
    try {
      for await (const entry of Deno.readDir(currentDir)) {
        if (entry.isDirectory && entry.name.startsWith(":")) {
          const paramDir = join(currentDir, entry.name);
          const indexPath = join(paramDir, "index.html");
          if (existsSync(indexPath) && (await Deno.stat(indexPath)).isFile) {
            return indexPath;
          }
        }
      }
    } catch {
      // Directory might not exist or not readable
    }

    return null;
  }

  // Try direct directory match first
  const directDir = join(currentDir, currentSegment);
  if (existsSync(directDir) && (await Deno.stat(directDir)).isDirectory) {
    const result = await findFileWithParams(
      directDir,
      restSegments,
      depth + 1,
      endsWithSlash,
    );
    if (result) return result;
  }

  // Try matching with :param directories
  try {
    for await (const entry of Deno.readDir(currentDir)) {
      if (entry.isDirectory && entry.name.startsWith(":")) {
        const paramDir = join(currentDir, entry.name);
        const result = await findFileWithParams(
          paramDir,
          restSegments,
          depth + 1,
          endsWithSlash,
        );
        if (result) return result;
      }
    }
  } catch {
    // Directory might not exist or not readable
  }

  return null;
}

/**
 * Get content type based on file extension
 */
function getContentType(ext: string | undefined): string {
  const types: Record<string, string> = {
    html: "text/html; charset=utf-8",
    css: "text/css; charset=utf-8",
    js: "application/javascript; charset=utf-8",
    json: "application/json; charset=utf-8",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
  };

  return types[ext || ""] || "application/octet-stream";
}
