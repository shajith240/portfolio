"use client";

export default function StatusBar({
  branch,
  language,
  cursorPosition,
}: {
  branch: string | null;
  language: string | null;
  cursorPosition: { line: number; column: number } | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "22px",
        background: "#007acc",
        color: "#ffffff",
        fontSize: "12px",
        padding: "0 10px",
        flexShrink: 0,
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <span>⎇ {branch ?? "main"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {cursorPosition && (
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", fontSize: "12px", color: "#ffffff" }}>
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
        )}
        <span>{language ?? ""}</span>
      </div>
    </div>
  );
}
