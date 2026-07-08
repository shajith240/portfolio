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
