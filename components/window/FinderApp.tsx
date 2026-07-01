"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { PROJECTS, type Project } from "@/data/projects";
import { CATEGORIES } from "@/data/skills";

/* Finder — a real React UI, not an iframe (see WindowState.kind in
   WindowManagerContext). Content tree mirrors real, already-existing
   data (data/projects.ts, data/skills.ts) — no invented content, and
   double-clicking an app/document opens the exact same window a Dock
   click would. The existing full-page galleries (/projects, /skills,
   etc.) are untouched; this is a second, additive way to browse
   toward the same content. See
   docs/superpowers/specs/2026-07-01-genie-effect-and-finder-design.md */

type FinderNode =
  | { kind: "folder"; name: string; children: FinderNode[]; iconFile?: string }
  | { kind: "app"; name: string; iconFile: string; route: string; label: string }
  | { kind: "document"; name: string; iconFile?: string; route: string; label: string }
  | { kind: "project"; name: string; project: Project }
  | { kind: "skill"; name: string; iconFile: string };

// Every project shows the same generic dev-project icon rather than
// the earlier per-project cycling through unrelated tool icons.
const PROJECT_ICON_FILE = "developer_code_flder";

const PROJECTS_FOLDER: FinderNode = {
  kind: "folder",
  name: "Projects",
  // Matches the Dock's own "/projects" icon — see Dock.tsx's ICON_FILE.
  iconFile: "projects",
  children: PROJECTS.map((p) => ({ kind: "project", name: `${p.title}.app`, project: p })),
};

const SKILLS_FOLDER: FinderNode = {
  kind: "folder",
  name: "Skills",
  // Matches the Dock's own "/skills" icon — see Dock.tsx's ICON_FILE.
  iconFile: "skills",
  children: CATEGORIES.map((cat) => ({
    kind: "folder",
    name: cat.label,
    children: cat.icons.map((icon) => ({ kind: "skill", name: icon.name, iconFile: icon.file })),
  })),
};

// Root-level Macintosh HD icons all match the Dock's own icon files
// for the same route (see Dock.tsx's ICON_FILE) — Finder and the Dock
// should never show two different icons for the same destination.
const ROOT: FinderNode = {
  kind: "folder",
  name: "Macintosh HD",
  children: [
    { kind: "document", name: "About Me.rtf", iconFile: "contact", route: "/about", label: "About" },
    PROJECTS_FOLDER,
    SKILLS_FOLDER,
    { kind: "app", name: "DSA.app", iconFile: "xcode", route: "/dsa", label: "DSA" },
    { kind: "app", name: "Notes.app", iconFile: "notes", route: "/notes", label: "Notes" },
    { kind: "app", name: "Uses.app", iconFile: "settings", route: "/uses", label: "Uses" },
  ],
};

// Real macOS folder icon (extracted from public/icons/folder_commond.icns'
// ic10 1024x1024 PNG chunk), replacing the earlier hand-drawn SVG
// approximation.
const FolderIcon = () => (
  <img src="/icons/folder_commond.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
);

const DocumentIcon = () => (
  <svg width="100%" height="100%" viewBox="0 0 80 100" fill="none">
    <path
      d="M10 4H50L70 24V92C70 94.2091 68.2091 96 66 96H10C7.79086 96 6 94.2091 6 92V8C6 5.79086 7.79086 4 10 4Z"
      fill="#FDFDFD"
      stroke="rgba(0,0,0,0.12)"
      strokeWidth="1.5"
    />
    <path d="M50 4V20C50 22.2091 51.7909 24 54 24H70" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" fill="none" />
    <line x1="16" y1="42" x2="60" y2="42" stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="16" y1="54" x2="60" y2="54" stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="16" y1="66" x2="42" y2="66" stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

function ChevronLeft({ disabled }: { disabled: boolean }) {
  return (
    <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
      <path d="M8 1L2 7L8 13" stroke={disabled ? "var(--text-dim)" : "var(--text-primary)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRight({ disabled }: { disabled: boolean }) {
  return (
    <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
      <path d="M1 1L7 7L1 13" stroke={disabled ? "var(--text-dim)" : "var(--text-primary)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" fill="var(--text-muted)" />
      <rect x="8" y="1" width="5" height="5" rx="1" fill="var(--text-muted)" />
      <rect x="1" y="8" width="5" height="5" rx="1" fill="var(--text-muted)" />
      <rect x="8" y="8" width="5" height="5" rx="1" fill="var(--text-muted)" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="var(--text-muted)" strokeWidth="1.4" />
      <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GridItem({ node, onOpen }: { node: FinderNode; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const name = node.name;
  const iconFile =
    node.kind === "app" || node.kind === "skill" || node.kind === "folder" || node.kind === "document"
      ? node.iconFile
      : null;

  return (
    <button
      onDoubleClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        width: "88px",
        padding: "8px 4px",
        borderRadius: "8px",
        background: hovered ? "rgba(255, 255, 255, 0.08)" : "transparent",
        border: "none",
        cursor: "default",
      }}
      title={name}
    >
      <div style={{ width: "52px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {node.kind === "project" ? (
          <img src={`/icons/${PROJECT_ICON_FILE}.png`} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "22%" }} />
        ) : iconFile ? (
          <img src={`/icons/${iconFile}.png`} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "22%" }} />
        ) : node.kind === "folder" ? (
          <FolderIcon />
        ) : (
          <DocumentIcon />
        )}
      </div>
      <span
        style={{
          fontSize: "11.5px",
          color: "var(--text-primary)",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100%",
        }}
      >
        {name}
      </span>
    </button>
  );
}

function QuickLook({ node, onClose, onOpenProjects }: { node: FinderNode; onClose: () => void; onOpenProjects: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.35)" }} />
      {/* Centering via a plain flex wrapper, not top/left/transform on the
          motion.div itself — Framer Motion composes its own `transform`
          from the animated scale/opacity props and overwrites any manual
          `transform` string passed through `style`, which silently
          discarded translate(-50%,-50%) and left the card's top-left
          corner (not its center) sitting at the midpoint. */}
      <div style={{ position: "absolute", inset: 0, zIndex: 51, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          style={{
            pointerEvents: "auto",
            width: "300px",
            padding: "20px",
            borderRadius: "16px",
            background: "var(--glass-thick-bg)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(var(--glass-blur-thick)) saturate(var(--glass-saturate))",
            WebkitBackdropFilter: "blur(var(--glass-blur-thick)) saturate(var(--glass-saturate))",
            boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
          }}
        >
        {node.kind === "project" ? (
          <>
            <img
              src={`/icons/${PROJECT_ICON_FILE}.png`}
              alt={node.project.title}
              style={{ width: "56px", height: "56px", objectFit: "contain", borderRadius: "22%", marginBottom: "12px" }}
            />
            <p style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
              {node.project.title}
            </p>
            <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "var(--text-muted)" }}>{node.project.sub}</p>
            <p style={{ margin: "0 0 12px 0", fontSize: "12.5px", lineHeight: 1.45, color: "var(--text-muted)" }}>
              {node.project.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
              {node.project.tech.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: "10.5px",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.08)",
                    color: "var(--text-muted)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <a
                href={node.project.github}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "8px 0",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.08)",
                  color: "var(--text-primary)",
                  textDecoration: "none",
                }}
              >
                GitHub →
              </a>
              <button
                onClick={onOpenProjects}
                style={{
                  flex: 1,
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "8px 0",
                  borderRadius: "8px",
                  background: "#FF4500",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Open in Projects
              </button>
            </div>
          </>
        ) : node.kind === "skill" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <img src={`/icons/${node.iconFile}.png`} alt={node.name} style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "22%" }} />
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{node.name}</p>
          </div>
        ) : null}
        </motion.div>
      </div>
    </>
  );
}

export default function FinderApp() {
  const { openWindow } = useWindowManager();
  const [path, setPath] = useState<FinderNode[]>([ROOT]);
  const [history, setHistory] = useState<FinderNode[][]>([[ROOT]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [quickLook, setQuickLook] = useState<FinderNode | null>(null);

  const currentFolder = path[path.length - 1];
  const children = currentFolder.kind === "folder" ? currentFolder.children : [];

  const navigateTo = (newPath: FinderNode[]) => {
    setPath(newPath);
    const truncated = history.slice(0, historyIndex + 1);
    truncated.push(newPath);
    setHistory(truncated);
    setHistoryIndex(truncated.length - 1);
  };

  const goBack = () => {
    if (historyIndex === 0) return;
    setHistoryIndex(historyIndex - 1);
    setPath(history[historyIndex - 1]);
  };
  const goForward = () => {
    if (historyIndex >= history.length - 1) return;
    setHistoryIndex(historyIndex + 1);
    setPath(history[historyIndex + 1]);
  };

  const openNode = (node: FinderNode) => {
    if (node.kind === "folder") {
      navigateTo([...path, node]);
    } else if (node.kind === "app" || node.kind === "document") {
      openWindow(node.route, node.label);
    } else {
      setQuickLook(node);
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const favorites = useMemo(
    () => [
      { label: "Macintosh HD", target: [ROOT] },
      { label: "Projects", target: [ROOT, PROJECTS_FOLDER] },
      { label: "Skills", target: [ROOT, SKILLS_FOLDER] },
    ],
    []
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Toolbar */}
      <div
        style={{
          height: "44px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "0 14px",
          background: "var(--glass-regular-bg)",
          borderBottom: "0.5px solid var(--glass-border)",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={goBack} disabled={!canGoBack} style={{ background: "none", border: "none", cursor: canGoBack ? "pointer" : "default", padding: 0 }}>
            <ChevronLeft disabled={!canGoBack} />
          </button>
          <button onClick={goForward} disabled={!canGoForward} style={{ background: "none", border: "none", cursor: canGoForward ? "pointer" : "default", padding: 0 }}>
            <ChevronRight disabled={!canGoForward} />
          </button>
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{currentFolder.name}</span>
        <div style={{ flex: 1 }} />
        <GridIcon />
        <SearchIcon />
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Sidebar */}
        <div
          style={{
            width: "170px",
            flexShrink: 0,
            padding: "14px 10px",
            background: "var(--glass-regular-bg)",
            borderRight: "0.5px solid var(--glass-border)",
            overflowY: "auto",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: "10.5px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-ghost)",
              padding: "0 8px 6px",
            }}
          >
            Favorites
          </span>
          {favorites.map((fav) => {
            const isSelected = currentFolder.name === fav.target[fav.target.length - 1].name;
            return (
              <button
                key={fav.label}
                onClick={() => navigateTo(fav.target)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  border: "none",
                  background: isSelected ? "rgba(255, 69, 0, 0.16)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ width: "16px", height: "16px", flexShrink: 0 }}>
                  <FolderIcon />
                </div>
                <span style={{ fontSize: "12.5px", color: isSelected ? "#FF4500" : "var(--text-primary)" }}>{fav.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content pane — same continuous glass material as the
            toolbar/sidebar (real Finder's body is one vibrancy surface,
            not a see-through hole). The actual blur is applied once, on
            Window.tsx's outer container, behind everything; each pane
            here only adds its own tint on top so there's no seam where
            independently-blurred regions meet. */}
        <div
          style={{
            flex: 1,
            padding: "18px",
            overflowY: "auto",
            position: "relative",
            background: "var(--glass-regular-bg)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {children.map((node) => (
              <GridItem key={node.name} node={node} onOpen={() => openNode(node)} />
            ))}
          </div>

          <AnimatePresence>
            {quickLook && (
              <QuickLook
                node={quickLook}
                onClose={() => setQuickLook(null)}
                onOpenProjects={() => {
                  openWindow("/projects", "Projects");
                  setQuickLook(null);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
