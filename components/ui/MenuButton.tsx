"use client";

import { useLayout } from "@/contexts/LayoutContext";

export default function MenuButton() {
  const { isNavOpen, toggleNav } = useLayout();

  return (
    <button
      onClick={toggleNav}
      style={{
        position: "fixed",
        top: "44px",
        right: "44px",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 14px",
        borderRadius: "99px",
        border: "1px solid #333",
        background: "transparent",
        color: "#ddd",
        fontSize: "14px",
        cursor: "pointer",
      }}
    >
      {isNavOpen ? (
        <>
          Close <span style={{ color: "#FF4500", marginLeft: "2px", fontWeight: "bold" }}>✕</span>
        </>
      ) : (
        <>
          Menu <span style={{ color: "#FF4500", marginLeft: "2px", fontWeight: "bold" }}>+</span>
        </>
      )}
    </button>
  );
}
