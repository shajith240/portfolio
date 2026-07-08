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
// `monaco` namespace once, so a later task's shell component can dispose a
// specific tab's model on close, and every remaining model on window close.
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
