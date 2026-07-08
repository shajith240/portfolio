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
