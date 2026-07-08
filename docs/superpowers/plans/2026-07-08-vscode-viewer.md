# Read-only VS Code Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Dock icon opens a window that looks and behaves exactly like real VS Code, browsing this portfolio's actual source live from `github.com/shajith240/portfolio`, read-only.

**Architecture:** New `"vscode"` window kind (sentinel route, same pattern as `"finder"`/`"credits"` in `WindowManagerContext`), rendered directly by `Window.tsx`, lazy-loaded via `next/dynamic`. Three cached Next.js API routes proxy GitHub's REST API (tree, file content, latest commit). A Monaco editor (`@monaco-editor/react`) renders file contents read-only in a hand-built VS Code shell (activity bar, Explorer, Search, Source Control, tabs, status bar, Ctrl/Cmd+P quick-open).

**Tech Stack:** Next.js App Router (Route Handlers), React, `@monaco-editor/react` (new dependency), TypeScript, GitHub REST API v3.

**Spec:** `docs/superpowers/specs/2026-07-08-vscode-viewer-design.md`

## Global Constraints

- Repo: `shajith240/portfolio`, branch `main` (verified as the actual default branch).
- Every API route caches via Next.js `fetch` with `next: { revalidate: 300 }` (5 minutes) — shared across visitors, still reflects a GitHub push within minutes without requiring a redeploy.
- Excluded from the file tree: any path containing a `node_modules`, `.next`, or `.git` path segment; exact filenames `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`; anything under `public/icons/`, `public/songs/`, `public/wallpapers/`, `public/motivation_quotes/`.
- Files over 500,000 bytes, or with a binary extension, are never sent as text content — the client shows a "binary file, not shown" placeholder instead.
- Only three Activity Bar icons exist: Explorer, Search, Source Control. No Run/Debug, no Extensions, no terminal — nothing that can't be genuinely functional.
- `VSCodeApp` and everything under `components/window/vscode/` must be loaded via `next/dynamic({ ssr: false })` from `Window.tsx` — zero bytes added to the initial page load; only fetched when the Dock icon is clicked.
- This codebase has no automated test runner configured (`package.json` has no `test` script, no jest/vitest devDependency) — consistent with the existing codebase convention (confirmed during design), verification in every task below is: `npx tsc --noEmit` for type safety, `curl` against the running dev server (`localhost:3000`, already running throughout this project's sessions) for API routes, and a manual browser check at the end for the full UI. This mirrors how every other feature in this repo has been verified this session.
- Dev server is already running on `localhost:3000` per prior sessions in this repo; if a task's curl check gets `curl: (7) Failed to connect`, start it first with `npm run dev` (backgrounded) before retrying — don't treat that as a code bug.

---

### Task 1: Wire the `"vscode"` window kind (plumbing only)

**Files:**
- Modify: `contexts/WindowManagerContext.tsx`
- Modify: `components/window/Window.tsx`
- Create: `components/window/VSCodeApp.tsx`

**Interfaces:**
- Produces: `openVSCode(): void` on the `WindowManagerContext` value. `win.kind` union includes `"vscode"`. `VSCodeApp` default export — a lazy wrapper component with no props.

This task only wires the window-opening mechanism, using a trivial placeholder body for `VSCodeApp` (a plain colored div) so the plumbing can be verified end-to-end before any real VS Code UI exists. Task 11 replaces the placeholder body with the real dynamic import.

- [ ] **Step 1: Add the `"vscode"` kind and `openVSCode` to `WindowManagerContext.tsx`**

In `contexts/WindowManagerContext.tsx`, change the `kind` field on `WindowState`:

```ts
  kind: "iframe" | "finder" | "credits" | "vscode";
```

Change `openWindowOfKind`'s parameter type to match:

```ts
  const openWindowOfKind = useCallback((route: string, title: string, kind: "iframe" | "finder" | "credits" | "vscode", size?: { width: number; height: number }) => {
```

Add to the `WindowManagerContextValue` interface, right after `openCredits`:

```ts
  openCredits: () => void;
  openVSCode: () => void;
```

Add the callback right after `openCredits`'s definition:

```ts
  // Same sentinel-route treatment as Finder/Credits — "vscode" is never a
  // real route, it's the VSCodeApp window kind. Sized larger than the
  // default content window since a code viewer needs real room.
  const openVSCode = useCallback(() => {
    openWindowOfKind("vscode", "VS Code", "vscode", { width: 1040, height: 680 });
  }, [openWindowOfKind]);
```

Add `openVSCode` to the context provider's `value` object, right after `openCredits`:

```ts
        openCredits,
        openVSCode,
```

- [ ] **Step 2: Create the `VSCodeApp` placeholder**

Create `components/window/VSCodeApp.tsx`:

```tsx
"use client";

export default function VSCodeApp() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#1e1e1e",
        color: "#cccccc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      VS Code viewer — plumbing check
    </div>
  );
}
```

- [ ] **Step 3: Render it from `Window.tsx`**

In `components/window/Window.tsx`, add the import next to the existing `FinderApp`/`CreditsApp` imports:

```tsx
import VSCodeApp from "@/components/window/VSCodeApp";
```

Change the kind-switch render block:

```tsx
      {win.kind === "finder" ? (
        <FinderApp />
      ) : win.kind === "credits" ? (
        <CreditsApp />
      ) : win.kind === "vscode" ? (
        <VSCodeApp />
      ) : (
        <iframe
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors (any pre-existing `.next/types` stale-cache errors from earlier renames are unrelated and fine).

- [ ] **Step 5: Wire the Dock icon to actually open it**

In `components/ui/Dock.tsx`, the `DOCK_ITEMS` entry for `vscode` currently has no click behavior (added in a previous session as icon-only). Update its type and the entry:

```ts
const DOCK_ITEMS: { href: string; label: string; isFinder: boolean; isCredits?: boolean; isVSCode?: boolean; external?: string }[] = [
```

```ts
  { href: "vscode", label: "VS Code", isFinder: false, isVSCode: true },
```

Update `handleClick`'s signature and the `isVSCode` branch (replace the old no-op branch):

```ts
  const handleClick = useCallback(
    (href: string, label: string, index: number, isFinder: boolean, external?: string, isCredits?: boolean, isVSCode?: boolean) => {
      const isOpen = windows.some((w) => w.route === href);

      if (external) {
        window.open(external, "_blank", "noopener,noreferrer");
      } else if (isFinder) {
        const finderOpen = windows.some((w) => w.route === "finder");
        if (!finderOpen) {
          setBounced(index);
          setTimeout(() => setBounced(null), 700);
          openFinder();
        } else {
          openFinder();
        }
      } else if (isCredits) {
        if (!isOpen) {
          setBounced(index);
          setTimeout(() => setBounced(null), 700);
        }
        openCredits();
      } else if (isVSCode) {
        if (!isOpen) {
          setBounced(index);
          setTimeout(() => setBounced(null), 700);
        }
        openVSCode();
      } else {
```

Update the `onClick` call site:

```tsx
              onClick={() => handleClick(item.href, item.label, i, item.isFinder, item.external, item.isCredits, item.isVSCode)}
```

Update the `useWindowManager()` destructure and the `handleClick` `useCallback` dependency array:

```ts
  const { windows, openWindow, openFinder, openCredits, openVSCode, registerDockIconEl } = useWindowManager();
```

```ts
    [openWindow, openFinder, openCredits, openVSCode, windows]
```

- [ ] **Step 6: Type-check again**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 7: Manual check**

With the dev server running (`localhost:3000`), open the site, click the VS Code Dock icon. Expected: a window opens titled "VS Code", showing the dark placeholder text "VS Code viewer — plumbing check". Closing and reopening should work like any other window (Credits, Finder).

- [ ] **Step 8: Commit**

```bash
git add contexts/WindowManagerContext.tsx components/window/Window.tsx components/window/VSCodeApp.tsx components/ui/Dock.tsx
git commit -m "feat: wire vscode window kind (placeholder body)"
```

---

### Task 2: Shared source-filtering utilities

**Files:**
- Create: `lib/vscodeSource.ts`

**Interfaces:**
- Produces: `MAX_TEXT_FILE_BYTES: number`, `isExcludedPath(path: string): boolean`, `isLikelyBinary(path: string): boolean`, `TreeNode` interface `{ name: string; path: string; type: "file" | "folder"; children?: TreeNode[] }`, `buildFileTree(paths: string[]): TreeNode[]`.
- Consumes: nothing (pure module, no other project code).

- [ ] **Step 1: Create the file**

Create `lib/vscodeSource.ts`:

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 3: Functional check via a throwaway script**

This project has no test runner, so verify the pure logic directly with `ts-node`-free plain Node by compiling nothing — instead exercise it the same way Task 3's API route will (that's the real integration test). For an immediate sanity check right now, run:

```bash
node -e "
const paths = ['app/layout.tsx','app/page.tsx','components/ui/Dock.tsx','components/window/Window.tsx','public/icons/finder.png','node_modules/x/y.js','package-lock.json'];
const excluded = ['public/icons/', 'public/songs/', 'public/wallpapers/', 'public/motivation_quotes/'];
const excludedFiles = new Set(['package-lock.json','pnpm-lock.yaml','yarn.lock']);
const excludedDirs = new Set(['node_modules','.next','.git']);
function isExcluded(p) {
  const segs = p.split('/');
  if (segs.some(s => excludedDirs.has(s))) return true;
  if (excludedFiles.has(segs[segs.length-1])) return true;
  if (excluded.some(pre => p.startsWith(pre))) return true;
  return false;
}
const kept = paths.filter(p => !isExcluded(p));
console.log(kept);
"
```

Expected output: `[ 'app/layout.tsx', 'app/page.tsx', 'components/ui/Dock.tsx', 'components/window/Window.tsx' ]` — confirms the exclusion rule shape is right (this reimplements the same rule inline since the real module is TypeScript and this repo has no ad-hoc TS runner; Task 3's curl check exercises the actual `lib/vscodeSource.ts` module for real).

- [ ] **Step 4: Commit**

```bash
git add lib/vscodeSource.ts
git commit -m "feat: add shared file-filtering and tree-building utilities for vscode viewer"
```

---

### Task 3: GitHub proxy API routes

**Files:**
- Create: `app/api/github/tree/route.ts`
- Create: `app/api/github/file/route.ts`
- Create: `app/api/github/commit/route.ts`

**Interfaces:**
- Consumes: `isExcludedPath`, `isLikelyBinary`, `MAX_TEXT_FILE_BYTES` from `lib/vscodeSource.ts` (Task 2).
- Produces: `GET /api/github/tree` → `{ paths: string[] }` or `{ error: string }` (502). `GET /api/github/file?path=...` → `{ content: string }` or `{ binary: true }` or `{ error: string }` (400/404). `GET /api/github/commit` → `{ branch, message, author, date, sha }` or `{ error: string }` (502/404).

- [ ] **Step 1: Create the tree route**

Create `app/api/github/tree/route.ts`:

```ts
import { NextResponse } from "next/server";
import { isExcludedPath } from "@/lib/vscodeSource";

const REPO = "shajith240/portfolio";
const BRANCH = "main";

interface GitHubTreeEntry {
  path: string;
  type: string;
}

export async function GET() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`,
    {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "github_unreachable" }, { status: 502 });
  }

  const data = (await res.json()) as { tree?: GitHubTreeEntry[] };
  const paths = (data.tree ?? [])
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path)
    .filter((path) => !isExcludedPath(path));

  return NextResponse.json({ paths });
}
```

- [ ] **Step 2: Create the file-content route**

Create `app/api/github/file/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { isLikelyBinary, MAX_TEXT_FILE_BYTES } from "@/lib/vscodeSource";

const REPO = "shajith240/portfolio";
const BRANCH = "main";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "missing_path" }, { status: 400 });
  }

  if (isLikelyBinary(path)) {
    return NextResponse.json({ binary: true });
  }

  const res = await fetch(
    `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_TEXT_FILE_BYTES) {
    return NextResponse.json({ binary: true });
  }

  const content = await res.text();
  if (content.length > MAX_TEXT_FILE_BYTES) {
    return NextResponse.json({ binary: true });
  }

  return NextResponse.json({ content });
}
```

- [ ] **Step 3: Create the commit route**

Create `app/api/github/commit/route.ts`:

```ts
import { NextResponse } from "next/server";

const REPO = "shajith240/portfolio";
const BRANCH = "main";

interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author?: { name?: string; date?: string };
  };
}

export async function GET() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/commits?sha=${BRANCH}&per_page=1`,
    {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "github_unreachable" }, { status: 502 });
  }

  const data = (await res.json()) as GitHubCommitResponse[];
  const latest = data[0];
  if (!latest) {
    return NextResponse.json({ error: "no_commits" }, { status: 404 });
  }

  return NextResponse.json({
    branch: BRANCH,
    message: latest.commit.message,
    author: latest.commit.author?.name ?? "unknown",
    date: latest.commit.author?.date ?? "",
    sha: latest.sha.slice(0, 7),
  });
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 5: Verify all three routes against the live dev server**

Run: `curl -s http://localhost:3000/api/github/tree | node -e "const fs=require('fs');let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('paths:',j.paths?.length,'sample:',j.paths?.slice(0,3));console.log('has node_modules:', j.paths?.some(p=>p.includes('node_modules')));console.log('has public/icons:', j.paths?.some(p=>p.startsWith('public/icons/')));})"`

Expected: `paths: <some number > 50>`, a 3-item sample of real repo paths, `has node_modules: false`, `has public/icons: false`.

Run: `curl -s "http://localhost:3000/api/github/file?path=package.json" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('has content:', typeof j.content === 'string' && j.content.includes('portfolio'));})"`

Expected: `has content: true`.

Run: `curl -s "http://localhost:3000/api/github/file?path=public/icons/finder.png" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{console.log(JSON.parse(d));})"`

Expected: `{ binary: true }` (caught by extension even though this path would've already been filtered from the tree — the file route defends independently).

Run: `curl -s http://localhost:3000/api/github/commit | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('branch:',j.branch,'has message:', typeof j.message === 'string', 'sha len:', j.sha?.length);})"`

Expected: `branch: main has message: true sha len: 7`.

- [ ] **Step 6: Commit**

```bash
git add app/api/github
git commit -m "feat: add cached GitHub proxy routes for tree, file, and commit data"
```

---

### Task 4: Client data hook with session caching and idle prefetch

**Files:**
- Create: `components/window/vscode/useGitHubSource.ts`

**Interfaces:**
- Consumes: `/api/github/tree`, `/api/github/file`, `/api/github/commit` (Task 3).
- Produces: `useGitHubTree(): { paths: string[] | null; error: boolean }`, `useGitHubFile(path: string | null): FileResult | null`, `useGitHubCommit(): CommitInfo | null`, `usePrefetchAllFiles(paths: string[] | null, stopped: () => boolean): void`, `getCachedFileContents(): Map<string, FileResult>`, exported types `FileResult { content: string | null; binary: boolean; error: boolean }` and `CommitInfo { branch: string; message: string; author: string; date: string; sha: string }`.

- [ ] **Step 1: Create the hook module**

Create `components/window/vscode/useGitHubSource.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface FileResult {
  content: string | null;
  binary: boolean;
  error: boolean;
}

export interface CommitInfo {
  branch: string;
  message: string;
  author: string;
  date: string;
  sha: string;
}

// Module-level (not component-level) caches — deliberately outlive any
// single VSCodeShell mount, so closing and reopening the window within the
// same page session costs nothing.
const treeCache: { paths: string[] | null; error: boolean } = { paths: null, error: false };
const fileCache = new Map<string, FileResult>();
let commitCache: CommitInfo | null = null;
let commitError = false;

async function fetchTreeOnce(): Promise<{ paths: string[]; error: boolean }> {
  if (treeCache.paths) return { paths: treeCache.paths, error: false };
  if (treeCache.error) return { paths: [], error: true };
  try {
    const res = await fetch("/api/github/tree");
    if (!res.ok) throw new Error("bad status");
    const data = (await res.json()) as { paths: string[] };
    treeCache.paths = data.paths;
    return { paths: treeCache.paths, error: false };
  } catch {
    treeCache.error = true;
    return { paths: [], error: true };
  }
}

async function fetchFileOnce(path: string): Promise<FileResult> {
  const cached = fileCache.get(path);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/github/file?path=${encodeURIComponent(path)}`);
    if (!res.ok) {
      const result: FileResult = { content: null, binary: false, error: true };
      fileCache.set(path, result);
      return result;
    }
    const data = (await res.json()) as { content?: string; binary?: boolean };
    const result: FileResult = {
      content: data.binary ? null : data.content ?? null,
      binary: Boolean(data.binary),
      error: false,
    };
    fileCache.set(path, result);
    return result;
  } catch {
    const result: FileResult = { content: null, binary: false, error: true };
    fileCache.set(path, result);
    return result;
  }
}

async function fetchCommitOnce(): Promise<CommitInfo | null> {
  if (commitCache) return commitCache;
  if (commitError) return null;
  try {
    const res = await fetch("/api/github/commit");
    if (!res.ok) throw new Error("bad status");
    commitCache = (await res.json()) as CommitInfo;
    return commitCache;
  } catch {
    commitError = true;
    return null;
  }
}

export function useGitHubTree() {
  const [paths, setPaths] = useState<string[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchTreeOnce().then((result) => {
      if (cancelled) return;
      setPaths(result.paths);
      setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { paths, error };
}

export function useGitHubFile(path: string | null) {
  const [result, setResult] = useState<FileResult | null>(null);

  useEffect(() => {
    if (!path) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setResult(null);
    fetchFileOnce(path).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return result;
}

export function useGitHubCommit() {
  const [commit, setCommit] = useState<CommitInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCommitOnce().then((c) => {
      if (!cancelled) setCommit(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return commit;
}

// Lazily fetches every file's content at idle priority, one at a time, so
// Search (Task 8) has content to search without blocking anything up front.
// Stops early once `stopped()` returns true (the window closed).
export function usePrefetchAllFiles(paths: string[] | null, stopped: () => boolean) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!paths || startedRef.current) return;
    startedRef.current = true;

    let index = 0;
    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
    };
    const schedule = idleWindow.requestIdleCallback
      ? (cb: () => void) => idleWindow.requestIdleCallback!(cb)
      : (cb: () => void) => window.setTimeout(cb, 200);

    function step() {
      if (stopped() || index >= paths!.length) return;
      const path = paths![index];
      index += 1;
      fetchFileOnce(path).finally(() => schedule(step));
    }

    schedule(step);
  }, [paths, stopped]);
}

export function getCachedFileContents(): Map<string, FileResult> {
  return fileCache;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/window/vscode/useGitHubSource.ts
git commit -m "feat: add cached GitHub data hooks for vscode viewer"
```

---

### Task 5: Monaco editor pane

**Files:**
- Create: `components/window/vscode/EditorPane.tsx`
- Modify: `package.json` (new dependency)

**Interfaces:**
- Produces: `languageForPath(path: string): string`, default export `EditorPane({ path: string; content: string; onMonacoReady: (monaco: typeof import("monaco-editor")) => void })`.

- [ ] **Step 1: Install the dependency**

Run: `npm install @monaco-editor/react`
Expected: adds `@monaco-editor/react` to `package.json` dependencies and installs successfully (it bundles Monaco itself as a transitive dependency — no separate `monaco-editor` install needed).

- [ ] **Step 2: Create the editor pane**

Create `components/window/vscode/EditorPane.tsx`:

```tsx
"use client";

import Editor from "@monaco-editor/react";

const LANGUAGE_BY_EXT: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  json: "json",
  css: "css",
  html: "html",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
};

export function languageForPath(path: string): string {
  const ext = path.includes(".") ? path.split(".").pop()!.toLowerCase() : "";
  return LANGUAGE_BY_EXT[ext] ?? "plaintext";
}

// `@monaco-editor/react` keeps one internal model alive per unique `path`
// it's ever seen, for the lifetime of this <Editor> instance — necessary
// for per-tab undo/scroll state, but it means models accumulate forever
// unless something disposes them. `onMonacoReady` hands the caller the
// `monaco` namespace once, so VSCodeShell (Task 10) can dispose a specific
// tab's model on close, and every remaining model on window close.
export default function EditorPane({
  path,
  content,
  onMonacoReady,
}: {
  path: string;
  content: string;
  onMonacoReady: (monaco: typeof import("monaco-editor")) => void;
}) {
  return (
    <Editor
      path={path}
      language={languageForPath(path)}
      value={content}
      theme="vs-dark"
      onMount={(_editor, monaco) => onMonacoReady(monaco)}
      options={{
        readOnly: true,
        minimap: { enabled: true },
        fontSize: 13,
        fontFamily: "Menlo, Consolas, monospace",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        domReadOnly: true,
      }}
    />
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components/window/vscode/EditorPane.tsx
git commit -m "feat: add Monaco-based read-only editor pane for vscode viewer"
```

---

### Task 6: File icons and Explorer sidebar

**Files:**
- Create: `components/window/vscode/fileIcons.tsx`
- Create: `components/window/vscode/Explorer.tsx`

**Interfaces:**
- Consumes: `TreeNode` from `lib/vscodeSource.ts` (Task 2).
- Produces: `FileIcon({ name: string })` component, default export `Explorer({ tree: TreeNode[]; activePath: string | null; onOpenFile: (path: string) => void })`.

- [ ] **Step 1: Create file icons**

Create `components/window/vscode/fileIcons.tsx`:

```tsx
// Simplified, non-infringing approximation of VS Code's default file
// icons — a colored document glyph keyed by extension (not a redistribution
// of any icon theme's actual asset files).

const EXT_COLORS: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#3178c6",
  mts: "#3178c6",
  js: "#e8c547",
  jsx: "#e8c547",
  mjs: "#e8c547",
  json: "#e8c547",
  css: "#8b5cf6",
  html: "#e34c26",
  md: "#8a9ba8",
  yml: "#cb171e",
  yaml: "#cb171e",
};

export function getFileIconColor(name: string): string {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : name.toLowerCase();
  return EXT_COLORS[ext] ?? "#8a9ba8";
}

export function FileIcon({ name }: { name: string }) {
  const color = getFileIconColor(name);
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M3 1.5h6l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z"
        fill={color}
        opacity="0.85"
      />
      <path d="M9 1.5v4h4" stroke="#1e1e1e" strokeWidth="0.75" fill="none" />
    </svg>
  );
}

export function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path
        d={
          open
            ? "M1.5 4.5h4l1.2 1.5H14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H1.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
            : "M1.5 3.5h4l1.2 1.5H14a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H1.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
        }
        fill="#c09553"
        opacity="0.9"
      />
    </svg>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.1s", flexShrink: 0 }}
    >
      <path d="M5 3l6 5-6 5" fill="none" stroke="#cccccc" strokeWidth="1.5" />
    </svg>
  );
}
```

- [ ] **Step 2: Create the Explorer**

Create `components/window/vscode/Explorer.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { TreeNode } from "@/lib/vscodeSource";
import { FileIcon, FolderIcon, Chevron } from "./fileIcons";

const ROW_FONT = "-apple-system, BlinkMacSystemFont, sans-serif";

function TreeRow({
  node,
  depth,
  activePath,
  onOpenFile,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onOpenFile: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);

  if (node.type === "file") {
    const isActive = node.path === activePath;
    return (
      <div
        onClick={() => onOpenFile(node.path)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "3px 8px",
          paddingLeft: `${depth * 12 + 22}px`,
          fontSize: "13px",
          color: isActive ? "#ffffff" : "#cccccc",
          background: isActive ? "#37373d" : "transparent",
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontFamily: ROW_FONT,
        }}
      >
        <FileIcon name={node.name} />
        <span>{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 8px",
          paddingLeft: `${depth * 12 + 8}px`,
          fontSize: "13px",
          color: "#cccccc",
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontFamily: ROW_FONT,
        }}
      >
        <Chevron open={open} />
        <FolderIcon open={open} />
        <span>{node.name}</span>
      </div>
      {open &&
        node.children?.map((child) => (
          <TreeRow key={child.path} node={child} depth={depth + 1} activePath={activePath} onOpenFile={onOpenFile} />
        ))}
    </div>
  );
}

export default function Explorer({
  tree,
  activePath,
  onOpenFile,
}: {
  tree: TreeNode[];
  activePath: string | null;
  onOpenFile: (path: string) => void;
}) {
  return (
    <div style={{ overflowY: "auto", height: "100%", paddingTop: "8px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "#bbbbbb", padding: "4px 20px", fontFamily: ROW_FONT }}>
        PORTFOLIO
      </div>
      {tree.map((node) => (
        <TreeRow key={node.path} node={node} depth={0} activePath={activePath} onOpenFile={onOpenFile} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/window/vscode/fileIcons.tsx components/window/vscode/Explorer.tsx
git commit -m "feat: add file icons and Explorer tree for vscode viewer"
```

---

### Task 7: Tab bar and status bar

**Files:**
- Create: `components/window/vscode/TabBar.tsx`
- Create: `components/window/vscode/StatusBar.tsx`

**Interfaces:**
- Produces: `OpenTab { path: string; name: string }` type, default export `TabBar({ tabs: OpenTab[]; activePath: string | null; onSelect: (path: string) => void; onClose: (path: string) => void })`. Default export `StatusBar({ branch: string | null; language: string | null })`.

- [ ] **Step 1: Create TabBar**

Create `components/window/vscode/TabBar.tsx`:

```tsx
"use client";

export interface OpenTab {
  path: string;
  name: string;
}

export default function TabBar({
  tabs,
  activePath,
  onSelect,
  onClose,
}: {
  tabs: OpenTab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}) {
  return (
    <div style={{ display: "flex", background: "#252526", height: "35px", overflowX: "auto", flexShrink: 0 }}>
      {tabs.map((tab) => {
        const isActive = tab.path === activePath;
        return (
          <div
            key={tab.path}
            onClick={() => onSelect(tab.path)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0 8px 0 14px",
              height: "100%",
              background: isActive ? "#1e1e1e" : "#2d2d2d",
              borderRight: "1px solid #1e1e1e",
              borderTop: isActive ? "1px solid #007acc" : "1px solid transparent",
              fontSize: "13px",
              color: isActive ? "#ffffff" : "#969696",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            <span>{tab.name}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.path);
              }}
              style={{
                width: "16px",
                height: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "3px",
                fontSize: "14px",
                lineHeight: 1,
              }}
            >
              ×
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create StatusBar**

Create `components/window/vscode/StatusBar.tsx`:

```tsx
"use client";

export default function StatusBar({ branch, language }: { branch: string | null; language: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "22px",
        background: "#007acc",
        color: "#ffffff",
        fontSize: "12px",
        padding: "0 10px",
        flexShrink: 0,
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <span>⎇ {branch ?? "main"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <span>{language ?? ""}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/window/vscode/TabBar.tsx components/window/vscode/StatusBar.tsx
git commit -m "feat: add tab bar and status bar for vscode viewer"
```

---

### Task 8: Search panel and Quick Open

**Files:**
- Create: `components/window/vscode/SearchPanel.tsx`
- Create: `components/window/vscode/QuickOpen.tsx`

**Interfaces:**
- Consumes: `getCachedFileContents` from `components/window/vscode/useGitHubSource.ts` (Task 4).
- Produces: default export `SearchPanel({ onOpenFile: (path: string) => void })`. Default export `QuickOpen({ paths: string[]; onOpenFile: (path: string) => void; onClose: () => void })`.

- [ ] **Step 1: Create SearchPanel**

Create `components/window/vscode/SearchPanel.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { getCachedFileContents } from "./useGitHubSource";

const ROW_FONT = "-apple-system, BlinkMacSystemFont, sans-serif";

export default function SearchPanel({ onOpenFile }: { onOpenFile: (path: string) => void }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    const needle = query.toLowerCase();
    const cache = getCachedFileContents();
    const matches: { path: string; line: number; text: string }[] = [];

    for (const [path, result] of cache.entries()) {
      if (!result.content) continue;
      const lines = result.content.split("\n");
      for (let i = 0; i < lines.length && matches.length < 200; i++) {
        if (lines[i].toLowerCase().includes(needle)) {
          matches.push({ path, line: i + 1, text: lines[i].trim().slice(0, 120) });
        }
      }
    }
    return matches;
  }, [query]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "8px" }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search"
        style={{
          background: "#3c3c3c",
          border: "1px solid #3c3c3c",
          color: "#cccccc",
          fontSize: "13px",
          padding: "5px 8px",
          outline: "none",
          fontFamily: ROW_FONT,
        }}
      />
      <div style={{ overflowY: "auto", marginTop: "8px", flex: 1 }}>
        {results.map((r, i) => (
          <div
            key={`${r.path}-${r.line}-${i}`}
            onClick={() => onOpenFile(r.path)}
            style={{ padding: "4px 6px", cursor: "pointer", fontSize: "12px", fontFamily: ROW_FONT }}
          >
            <div style={{ color: "#9cdcfe" }}>
              {r.path}:{r.line}
            </div>
            <div style={{ color: "#808080", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.text}
            </div>
          </div>
        ))}
        {query.trim().length >= 2 && results.length === 0 && (
          <div style={{ color: "#808080", fontSize: "12px", padding: "6px", fontFamily: ROW_FONT }}>No results found.</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create QuickOpen**

Create `components/window/vscode/QuickOpen.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";

const ROW_FONT = "-apple-system, BlinkMacSystemFont, sans-serif";

export default function QuickOpen({
  paths,
  onOpenFile,
  onClose,
}: {
  paths: string[];
  onOpenFile: (path: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = query.toLowerCase();
    return paths.filter((p) => p.toLowerCase().includes(needle)).slice(0, 50);
  }, [paths, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        justifyContent: "center",
        paddingTop: "80px",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "560px",
          maxHeight: "400px",
          background: "#252526",
          border: "1px solid #454545",
          borderRadius: "6px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Go to file..."
          style={{
            background: "transparent",
            border: "none",
            borderBottom: "1px solid #454545",
            color: "#cccccc",
            fontSize: "14px",
            padding: "10px 12px",
            outline: "none",
            fontFamily: ROW_FONT,
          }}
        />
        <div style={{ overflowY: "auto" }}>
          {results.map((path) => (
            <div
              key={path}
              onClick={() => {
                onOpenFile(path);
                onClose();
              }}
              style={{ padding: "6px 12px", fontSize: "13px", color: "#cccccc", cursor: "pointer", fontFamily: ROW_FONT }}
            >
              {path}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/window/vscode/SearchPanel.tsx components/window/vscode/QuickOpen.tsx
git commit -m "feat: add search panel and quick-open palette for vscode viewer"
```

---

### Task 9: Source Control panel

**Files:**
- Create: `components/window/vscode/SourceControlPanel.tsx`

**Interfaces:**
- Consumes: `CommitInfo` type from `components/window/vscode/useGitHubSource.ts` (Task 4).
- Produces: default export `SourceControlPanel({ commit: CommitInfo | null })`.

- [ ] **Step 1: Create the panel**

Create `components/window/vscode/SourceControlPanel.tsx`:

```tsx
"use client";

import type { CommitInfo } from "./useGitHubSource";

const ROW_FONT = "-apple-system, BlinkMacSystemFont, sans-serif";

export default function SourceControlPanel({ commit }: { commit: CommitInfo | null }) {
  if (!commit) {
    return (
      <div style={{ padding: "12px", color: "#808080", fontSize: "12px", fontFamily: ROW_FONT }}>
        Couldn&apos;t reach GitHub.
      </div>
    );
  }

  return (
    <div style={{ padding: "12px", fontFamily: ROW_FONT }}>
      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "#bbbbbb", marginBottom: "10px" }}>
        SOURCE CONTROL
      </div>
      <div style={{ fontSize: "13px", color: "#cccccc", marginBottom: "6px" }}>
        Branch: <span style={{ color: "#9cdcfe" }}>{commit.branch}</span>
      </div>
      <div style={{ fontSize: "13px", color: "#cccccc", marginBottom: "6px" }}>Latest commit ({commit.sha}):</div>
      <div style={{ fontSize: "13px", color: "#d4d4d4", marginBottom: "6px", lineHeight: 1.4 }}>{commit.message}</div>
      <div style={{ fontSize: "12px", color: "#808080" }}>
        {commit.author} · {commit.date ? new Date(commit.date).toLocaleDateString() : ""}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/window/vscode/SourceControlPanel.tsx
git commit -m "feat: add source control panel for vscode viewer"
```

---

### Task 10: Assemble the shell

**Files:**
- Create: `components/window/vscode/VSCodeShell.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2, 4, 6, 7, 8, 9 (`buildFileTree`/`TreeNode`, the four hooks, `Explorer`, `TabBar`/`OpenTab`, `StatusBar`, `EditorPane`/`languageForPath`/`onMonacoReady`, `SearchPanel`, `SourceControlPanel`, `QuickOpen`).
- Produces: default export `VSCodeShell()` — the full assembled window body, no props. Disposes Monaco models on tab-close and on window-close (spec's Performance requirement).

- [ ] **Step 1: Create the shell**

Create `components/window/vscode/VSCodeShell.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildFileTree } from "@/lib/vscodeSource";
import { useGitHubTree, useGitHubFile, useGitHubCommit, usePrefetchAllFiles } from "./useGitHubSource";
import Explorer from "./Explorer";
import TabBar, { type OpenTab } from "./TabBar";
import StatusBar from "./StatusBar";
import EditorPane, { languageForPath } from "./EditorPane";
import SearchPanel from "./SearchPanel";
import SourceControlPanel from "./SourceControlPanel";
import QuickOpen from "./QuickOpen";

type ActivityPanel = "explorer" | "search" | "scm";
const ROW_FONT = "-apple-system, BlinkMacSystemFont, sans-serif";

export default function VSCodeShell() {
  const { paths, error: treeError } = useGitHubTree();
  const commit = useGitHubCommit();
  const [activePanel, setActivePanel] = useState<ActivityPanel>("explorer");
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const closedRef = useRef(false);
  // Set once EditorPane's <Editor onMount> fires (Task 5) — used to dispose
  // per-tab models on close and every remaining model on window close,
  // since @monaco-editor/react otherwise keeps one model alive per unique
  // path for as long as this component tree is mounted.
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

  useEffect(
    () => () => {
      closedRef.current = true;
      monacoRef.current?.editor.getModels().forEach((model) => model.dispose());
    },
    []
  );

  usePrefetchAllFiles(paths, useCallback(() => closedRef.current, []));

  const activeFile = useGitHubFile(activePath);

  const openFile = useCallback((path: string) => {
    setTabs((prev) => {
      if (prev.some((t) => t.path === path)) return prev;
      const name = path.split("/").pop() ?? path;
      return [...prev, { path, name }];
    });
    setActivePath(path);
  }, []);

  const closeTab = useCallback(
    (path: string) => {
      const monaco = monacoRef.current;
      if (monaco) {
        monaco.editor.getModel(monaco.Uri.file(path))?.dispose();
      }
      setTabs((prev) => {
        const next = prev.filter((t) => t.path !== path);
        if (activePath === path) {
          setActivePath(next.length > 0 ? next[next.length - 1].path : null);
        }
        return next;
      });
    },
    [activePath]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setQuickOpenVisible(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (treeError) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1e1e1e",
          color: "#cccccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "13px",
          fontFamily: ROW_FONT,
        }}
      >
        Couldn&apos;t reach GitHub. Try again in a moment.
      </div>
    );
  }

  if (!paths) {
    return <div style={{ width: "100%", height: "100%", background: "#1e1e1e" }} />;
  }

  const tree = buildFileTree(paths);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative", background: "#1e1e1e" }}>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div
          style={{
            width: "48px",
            background: "#333333",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "8px",
            gap: "18px",
            flexShrink: 0,
          }}
        >
          {(["explorer", "search", "scm"] as ActivityPanel[]).map((panel) => (
            <button
              key={panel}
              onClick={() => setActivePanel(panel)}
              title={panel === "explorer" ? "Explorer" : panel === "search" ? "Search" : "Source Control"}
              style={{
                width: "100%",
                height: "36px",
                border: "none",
                background: "transparent",
                borderLeft: activePanel === panel ? "2px solid #ffffff" : "2px solid transparent",
                color: activePanel === panel ? "#ffffff" : "#858585",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              {panel === "explorer" ? "▤" : panel === "search" ? "⌕" : "⎇"}
            </button>
          ))}
        </div>

        <div style={{ width: "240px", background: "#252526", flexShrink: 0, overflow: "hidden" }}>
          {activePanel === "explorer" && <Explorer tree={tree} activePath={activePath} onOpenFile={openFile} />}
          {activePanel === "search" && <SearchPanel onOpenFile={openFile} />}
          {activePanel === "scm" && <SourceControlPanel commit={commit} />}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {tabs.length > 0 && <TabBar tabs={tabs} activePath={activePath} onSelect={setActivePath} onClose={closeTab} />}
          <div style={{ flex: 1, minHeight: 0 }}>
            {activePath && activeFile ? (
              activeFile.binary ? (
                <div style={{ color: "#808080", fontSize: "13px", padding: "20px", fontFamily: ROW_FONT }}>Binary file, not shown.</div>
              ) : activeFile.error ? (
                <div style={{ color: "#808080", fontSize: "13px", padding: "20px", fontFamily: ROW_FONT }}>Couldn&apos;t load this file.</div>
              ) : (
                <EditorPane
                  path={activePath}
                  content={activeFile.content ?? ""}
                  onMonacoReady={(monaco) => {
                    monacoRef.current = monaco;
                  }}
                />
              )
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#1e1e1e" }} />
            )}
          </div>
        </div>
      </div>

      <StatusBar branch={commit?.branch ?? null} language={activePath ? languageForPath(activePath) : null} />

      {quickOpenVisible && <QuickOpen paths={paths} onOpenFile={openFile} onClose={() => setQuickOpenVisible(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/window/vscode/VSCodeShell.tsx
git commit -m "feat: assemble vscode viewer shell"
```

---

### Task 11: Swap the placeholder for the real lazy-loaded shell, final verification

**Files:**
- Modify: `components/window/VSCodeApp.tsx`

**Interfaces:**
- Consumes: `VSCodeShell` default export (Task 10).
- Produces: `VSCodeApp` now renders the real shell, dynamically imported, `ssr: false`.

- [ ] **Step 1: Replace the placeholder body**

Replace the entire contents of `components/window/VSCodeApp.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";

// ssr:false + dynamic import means Monaco and the whole VS Code shell add
// zero bytes to the initial page load — only fetched once this Dock icon
// is actually clicked.
const VSCodeShell = dynamic(() => import("./vscode/VSCodeShell"), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%", background: "#1e1e1e" }} />,
});

export default function VSCodeApp() {
  return <VSCodeShell />;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 3: Confirm the dynamic import isn't in the initial bundle**

Run: `curl -s http://localhost:3000/ | grep -o "monaco-editor" | head -1`
Expected: no output (empty) — confirms Monaco's chunk isn't referenced from the home page's initial HTML/script tags.

- [ ] **Step 4: Manual end-to-end check in the browser**

With the dev server running:
1. Open the site, click the VS Code Dock icon. Expected: window opens, dark VS Code-style shell appears, Explorer shows the real repo file tree (e.g. `app/`, `components/`, `package.json`).
2. Click a `.tsx` file. Expected: it opens in a new tab, content matches the real file, syntax-highlighted, minimap visible on the right.
3. Open a second file. Expected: two tabs now open; clicking between them switches the editor content; the × on a tab closes it.
4. Click the Search icon, type a string known to exist in the repo (e.g. `WindowManagerContext`). Expected: results appear (may take a few seconds right after opening while the background prefetch catches up); clicking one opens that file at that location's tab.
5. Click the Source Control icon. Expected: shows a real commit message/author/date and the branch name `main`.
6. Press Ctrl/Cmd+P. Expected: the quick-open palette appears; typing filters the file list; selecting one opens it.
7. Close the window and reopen it from the Dock. Expected: tree loads instantly (no loading flash) — confirms the session cache from Task 4 is working.
8. Open several files, close a tab, open more files, then close the whole window — watch the browser console throughout (F12). Expected: no errors (a disposed-model-reused error would throw here first) — confirms Task 10's Monaco disposal logic runs cleanly on both tab-close and window-close.

- [ ] **Step 5: Commit**

```bash
git add components/window/VSCodeApp.tsx
git commit -m "feat: enable full read-only vscode source viewer"
```
