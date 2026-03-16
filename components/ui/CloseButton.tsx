"use client";

export default function CloseButton() {
  return (
    <button
      className="fixed z-20 flex items-center gap-1.5"
      style={{
        top: "20px",
        right: "20px",
        fontSize: "13px",
        color: "#888888",
        backgroundColor: "transparent",
        border: "1px solid #333333",
        borderRadius: "999px",
        padding: "8px 16px",
        cursor: "pointer",
      }}
    >
      Menu +
    </button>
  );
}
