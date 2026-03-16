"use client";

import { motion } from "framer-motion";

const TrackpadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M2 17h20" />
    <path d="M6 21h12" />
  </svg>
);

const ArrowButton = ({ glyph }: { glyph: string }) => (
  <div
    style={{
      width: "22px",
      height: "22px",
      border: "1px solid #444444",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      color: "#666666",
      lineHeight: 1,
    }}
  >
    {glyph}
  </div>
);

interface DragPillProps {
  ml: number;
  mr: number;
}

export default function DragPill({ ml, mr }: DragPillProps) {
  return (
    // Span the full canvas area (left edge → right edge) and center the pill inside
    <motion.div
      animate={{ left: `${ml}px`, right: `${mr}px` }}
      transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 }}
      style={{
        position: "fixed",
        top: "16px",
        zIndex: 20,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          backgroundColor: "#1a1a1a",
          border: "1px solid #333333",
          borderRadius: "999px",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "12px",
          color: "#666666",
        }}
      >
        <TrackpadIcon />
        <span>Drag or use</span>
        <ArrowButton glyph="↑" />
        <ArrowButton glyph="↓" />
      </div>
    </motion.div>
  );
}
