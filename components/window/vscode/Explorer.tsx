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
