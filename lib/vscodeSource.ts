// Shared between the GitHub-proxying API routes (app/api/github/*) and the
// VS Code viewer's Explorer — kept here so both sides filter/detect exactly
// the same way rather than duplicating the rules.

export const MAX_TEXT_FILE_BYTES = 500_000;

const EXCLUDED_DIR_SEGMENTS = new Set(["node_modules", ".next", ".git"]);
const EXCLUDED_EXACT_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);
const EXCLUDED_PATH_PREFIXES = [
  "public/icons/",
  "public/songs/",
  "public/wallpapers/",
  "public/motivation_quotes/",
];

export function isExcludedPath(path: string): boolean {
  const segments = path.split("/");
  if (segments.some((s) => EXCLUDED_DIR_SEGMENTS.has(s))) return true;
  const filename = segments[segments.length - 1];
  if (EXCLUDED_EXACT_FILES.has(filename)) return true;
  if (EXCLUDED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  return false;
}

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "avif", "ico", "icns",
  "woff", "woff2", "ttf", "otf",
  "m4a", "mp3", "wav", "ogg", "flac", "mp4", "mov",
  "pdf", "zip",
]);

export function isLikelyBinary(path: string): boolean {
  const ext = path.includes(".") ? path.split(".").pop()!.toLowerCase() : "";
  return BINARY_EXTENSIONS.has(ext);
}

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

// Turns a flat list of repo-relative paths ("app/layout.tsx",
// "components/ui/Dock.tsx", ...) into a nested tree, folders sorted before
// files and alphabetically within each group — matching VS Code's default
// Explorer sort order.
export function buildFileTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const path of paths) {
    const segments = path.split("/");
    let level = root;
    let currentPath = "";
    segments.forEach((segment, i) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isFile = i === segments.length - 1;
      let node = level.find((n) => n.name === segment);
      if (!node) {
        node = {
          name: segment,
          path: currentPath,
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
        };
        level.push(node);
      }
      if (!isFile) level = node.children!;
    });
  }

  const sortRecursive = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sortRecursive(n.children));
  };
  sortRecursive(root);

  return root;
}
