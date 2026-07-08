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
