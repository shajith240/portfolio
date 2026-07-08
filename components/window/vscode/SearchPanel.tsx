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
