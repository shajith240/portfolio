"use client";

import { motion } from "framer-motion";

const DragDeviceIcon = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true" style={{ color: "var(--drag-icon-stroke)" }}>
    <path d="M2 3.25H14" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" opacity="0.72" />
    <rect x="3" y="6" width="10" height="3.15" rx="1.2" fill="currentColor" opacity="0.86" />
    <path d="M5.2 10.75H10.8" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" opacity="0.42" />
  </svg>
);

const ChevronUp = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
    <path d="M2.3 5.55 4.5 3.35l2.2 2.2" stroke="var(--arrow-chevron)" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDown = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
    <path d="M2.3 3.45 4.5 5.65l2.2-2.2" stroke="var(--arrow-chevron)" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function ArrowBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.06, backgroundColor: "var(--arrow-btn-hover-bg)" }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 560, damping: 34 }}
      style={{
        width: "18px",
        height: "18px",
        borderRadius: "5px",
        background: "var(--arrow-btn-bg)",
        border: "0.5px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        color: "var(--arrow-chevron)",
        transition: "background 0.18s ease, color 0.18s ease",
      }}
    >
      {children}
    </motion.button>
  );
}

interface DragPillProps {
  ml: number;
  mr: number;
  onNext: () => void;
  onPrev: () => void;
}

export default function DragPill({ ml, mr, onNext, onPrev }: DragPillProps) {
  return (
    <motion.div
      animate={{ left: `${ml}px`, right: `${mr}px` }}
      transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 }}
      style={{
        position: "fixed",
        top: "18px",
        zIndex: 20,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          background: "var(--drag-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "0.5px solid var(--drag-border)",
          borderRadius: "15px",
          padding: "7px 8px 7px 11px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "var(--drag-shadow)",
          transition: "background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease",
        }}
      >
        <DragDeviceIcon />

        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--drag-text)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: "0",
            userSelect: "none",
            transition: "color 0.22s ease",
          }}
        >
          Drag or use
        </span>

        <div style={{ display: "flex", gap: "4px" }}>
          <ArrowBtn onClick={onNext} label="Next project">
            <ChevronUp />
          </ArrowBtn>
          <ArrowBtn onClick={onPrev} label="Previous project">
            <ChevronDown />
          </ArrowBtn>
        </div>
      </div>
    </motion.div>
  );
}
