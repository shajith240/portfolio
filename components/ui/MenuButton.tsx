"use client";

import { useLayout } from "@/contexts/LayoutContext";
import { usePathname } from "next/navigation";

export default function MenuButton() {
  const { isNavOpen, toggleNav } = useLayout();
  const pathname = usePathname();
  const forceDarkChrome = pathname === "/dsa";

  return (
    <button
      onClick={toggleNav}
      style={{
        position: "fixed",
        top: "32px",
        right: "32px",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 14px",
        borderRadius: "99px",
        border: `1px solid ${forceDarkChrome ? "#333333" : "var(--menu-btn-border)"}`,
        background: "transparent",
        color: forceDarkChrome ? "#dddddd" : "var(--menu-btn-text)",
        fontSize: "14px",
        cursor: "pointer",
        transition: "color 0.22s ease, border-color 0.22s ease",
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
