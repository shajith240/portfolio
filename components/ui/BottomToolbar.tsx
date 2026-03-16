"use client";

import { motion } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";

const IconButton = ({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) => (
  <button
    style={{
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      backgroundColor: active ? "#FF4500" : "#1a1a1a",
      border: active ? "none" : "1px solid #333333",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: 0,
    }}
  >
    {children}
  </button>
);

const PersonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const DotIcon = () => (
  <svg width="8" height="8" viewBox="0 0 24 24" fill="#666666" stroke="none">
    <circle cx="12" cy="12" r="8" />
  </svg>
);

const RecordDot = () => (
  <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="none">
    <circle cx="12" cy="12" r="8" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

interface BottomToolbarProps {
  ml: number;
  mr: number;
}

export default function BottomToolbar({ ml, mr }: BottomToolbarProps) {
  const { isSidebarOpen, isNavOpen, openSearch } = useLayout();
  // Sidebar: left 20px + width 360px = 380px right edge. Nav: right 20px + width 480px = 500px from right.
  const leftPos = isSidebarOpen ? 396 : 32;
  const rightPos = isNavOpen ? 516 : 32;

  return (
    <motion.div
      animate={{ left: `${leftPos}px`, right: `${rightPos}px` }}
      transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85 }}
      style={{
        position: "fixed",
        bottom: "28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 50,
      }}
    >
      {/* Left — icon buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <IconButton>
          <PersonIcon />
        </IconButton>
        <IconButton>
          <DotIcon />
        </IconButton>
        <IconButton active>
          <RecordDot />
        </IconButton>
      </div>

      {/* Right — command palette trigger */}
      <button
        onClick={openSearch}
        style={{
          backgroundColor: "#1a1a1a",
          border: "1px solid #333333",
          borderRadius: "999px",
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
        }}
      >
        <SearchIcon />
        <span style={{ fontSize: "12px", color: "#666666" }}>⌘K</span>
      </button>
    </motion.div>
  );
}
