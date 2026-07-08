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
