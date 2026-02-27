import { join } from "@std/path";

export const STATIC_ROOT = new URL("../../client/_site", import.meta.url)
  .pathname;
const PATH_INDEX = buildPathIndex(STATIC_ROOT);

type TrieNode = {
  children: Map<string, TrieNode>;
  paramChildren: Array<{ segment: string; node: TrieNode }>;
  filePath?: string;
};

type PathIndex = {
  files: Set<string>;
  dynamicFiles: string[];
  dynamicDirs: Set<string>;
  dynamicTrie: TrieNode;
};

/**
 * Rewrite request path with automatic resolution of dynamic path parameters
 * like `:serviceName`, `:errorHash`, etc.
 *
 * Example: GET /dashboard/o.kbn.one/index.js
 *          -> Rewrites to /dashboard/:serviceName/index.js
 */
export function rewriteRequestPath(path: string): string {
  const rewritten = resolvePathWithParams(STATIC_ROOT, path);
  if (!rewritten) {
    return path;
  }

  return rewritten.startsWith("/") ? rewritten : `/${rewritten}`;
}

/**
 * Resolve a request path to an actual file path, trying dynamic parameter substitutions
 *
 * @param root - Base directory
 * @param requestPath - Request path (e.g., /dashboard/o.kbn.one/index.js)
 * @returns Resolved file path or null if not found
 */
function resolvePathWithParams(
  _root: string,
  requestPath: string,
): string | null {
  const { normalizedPath, endsWithSlash } = normalizeRequestPath(requestPath);

  const directHit = findDirectFile(normalizedPath, endsWithSlash);
  if (directHit) {
    return directHit;
  }

  if (PATH_INDEX.dynamicDirs.size === 0) {
    return null;
  }

  return findDynamicFile(normalizedPath, endsWithSlash);
}

/**
 * Recursively try to find a file by substituting path segments with :param directories
 */
function normalizeRequestPath(requestPath: string): {
  normalizedPath: string;
  endsWithSlash: boolean;
} {
  const noLeadingSlash = requestPath.startsWith("/")
    ? requestPath.slice(1)
    : requestPath;

  const endsWithSlash = noLeadingSlash.endsWith("/");
  const trimmed = endsWithSlash && noLeadingSlash.length > 1
    ? noLeadingSlash.slice(0, -1)
    : noLeadingSlash;

  if (trimmed === "" || trimmed === "/") {
    return { normalizedPath: "index.html", endsWithSlash: false };
  }

  return { normalizedPath: trimmed, endsWithSlash };
}

function findDirectFile(path: string, endsWithSlash: boolean): string | null {
  if (!endsWithSlash && PATH_INDEX.files.has(path)) {
    return path;
  }

  const indexPath = `${path}/index.html`;
  if (PATH_INDEX.files.has(indexPath)) {
    return indexPath;
  }

  return null;
}

function findDynamicFile(path: string, endsWithSlash: boolean): string | null {
  const segments = path.split("/").filter(Boolean);

  if (!endsWithSlash) {
    const directMatch = matchTrie(segments, PATH_INDEX.dynamicTrie);
    if (directMatch) {
      return directMatch;
    }
  }

  const directoryMatch = matchTrie([
    ...segments,
    "index.html",
  ], PATH_INDEX.dynamicTrie);
  return directoryMatch;
}

function matchTrie(
  segments: string[],
  node: TrieNode,
  index = 0,
): string | null {
  if (index === segments.length) {
    return node.filePath ?? null;
  }

  const segment = segments[index];
  const staticChild = node.children.get(segment);
  if (staticChild) {
    const staticResult = matchTrie(segments, staticChild, index + 1);
    if (staticResult) {
      return staticResult;
    }
  }

  for (const { node: paramNode } of node.paramChildren) {
    const paramResult = matchTrie(segments, paramNode, index + 1);
    if (paramResult) {
      return paramResult;
    }
  }

  return null;
}

function createTrieNode(): TrieNode {
  return {
    children: new Map<string, TrieNode>(),
    paramChildren: [],
  };
}

function addPathToTrie(root: TrieNode, path: string): void {
  const segments = path.split("/").filter(Boolean);
  let node = root;

  for (const segment of segments) {
    if (segment.startsWith(":")) {
      const existing = node.paramChildren.find((item) =>
        item.segment === segment
      )
        ?.node;
      if (existing) {
        node = existing;
        continue;
      }

      const newNode = createTrieNode();
      node.paramChildren.push({ segment, node: newNode });
      node = newNode;
      continue;
    }

    const existing = node.children.get(segment);
    if (existing) {
      node = existing;
      continue;
    }

    const newNode = createTrieNode();
    node.children.set(segment, newNode);
    node = newNode;
  }

  node.filePath = path;
}

function buildPathIndex(root: string): PathIndex {
  const files = new Set<string>();
  const dynamicFiles: string[] = [];
  const dynamicDirs = new Set<string>();
  const dynamicTrie = createTrieNode();

  const stack = ["" as string];

  while (stack.length > 0) {
    const relativeDir = stack.pop();
    if (relativeDir === undefined) {
      continue;
    }

    const absoluteDir = relativeDir === "" ? root : join(root, relativeDir);

    let entries: Deno.DirEntry[] = [];
    try {
      entries = [...Deno.readDirSync(absoluteDir)];
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        continue;
      }
      throw error;
    }

    for (const entry of entries) {
      const relativePath = relativeDir === ""
        ? entry.name
        : `${relativeDir}/${entry.name}`;

      if (entry.isDirectory) {
        if (entry.name.includes(":")) {
          dynamicDirs.add(relativePath);
        }
        stack.push(relativePath);
        continue;
      }

      if (!entry.isFile) {
        continue;
      }

      files.add(relativePath);
      if (relativePath.includes(":")) {
        dynamicFiles.push(relativePath);
      }
    }
  }

  for (const file of dynamicFiles) {
    addPathToTrie(dynamicTrie, file);
  }

  return {
    files,
    dynamicFiles,
    dynamicDirs,
    dynamicTrie,
  };
}
