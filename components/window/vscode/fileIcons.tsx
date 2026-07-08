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
