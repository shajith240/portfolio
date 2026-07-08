"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildFileTree, isLikelyBinary } from "@/lib/vscodeSource";
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
  const [cursorPosition, setCursorPosition] = useState<{ line: number; column: number } | null>(null);
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

  const textPaths = paths ? paths.filter((p) => !isLikelyBinary(p)) : paths;
  usePrefetchAllFiles(textPaths, useCallback(() => closedRef.current, []));

  const activeFile = useGitHubFile(activePath);

  useEffect(() => {
    setCursorPosition(null);
  }, [activePath]);

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
        monaco.editor.getModel(monaco.Uri.parse(path))?.dispose();
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
                  onCursorPositionChange={(line, column) => setCursorPosition({ line, column })}
                />
              )
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#1e1e1e" }} />
            )}
          </div>
        </div>
      </div>

      <StatusBar
        branch={commit?.branch ?? null}
        language={activePath ? languageForPath(activePath) : null}
        cursorPosition={cursorPosition}
      />

      {quickOpenVisible && <QuickOpen paths={paths} onOpenFile={openFile} onClose={() => setQuickOpenVisible(false)} />}
    </div>
  );
}
