"use client";

import { motion } from "framer-motion";

/* ── Icons — strokes use CSS variables via currentColor ─────────── */

const TrackpadIcon = () => (
  <svg width="15" height="13" viewBox="0 0 15 13" fill="none" style={{ color: "var(--drag-icon-stroke)" }}>
    <rect x="0.5" y="0.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1" />
    <line x1="0.5" y1="6.5" x2="14.5" y2="6.5" stroke="currentColor" strokeWidth="1" />
    <line x1="3" y1="10" x2="3" y2="12.5" stroke="var(--drag-icon-legs)" strokeWidth="1" strokeLinecap="round" />
    <line x1="7.5" y1="10" x2="7.5" y2="12.5" stroke="var(--drag-icon-legs)" strokeWidth="1" strokeLinecap="round" />
    <line x1="12" y1="10" x2="12" y2="12.5" stroke="var(--drag-icon-legs)" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const ChevronUp = () => (
  <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
    <path d="M1 6L5 2L9 6" stroke="var(--arrow-chevron)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDown = () => (
  <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
    <path d="M1 1L5 5L9 1" stroke="var(--arrow-chevron)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Arrow button ──────────────────────────────────────────────────── */

function ArrowBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08, backgroundColor: "var(--arrow-btn-hover-bg)" }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      style={{
        width: "26px",
        height: "26px",
        borderRadius: "7px",
        background: "var(--arrow-btn-bg)",
        border: "0.5px solid var(--arrow-btn-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        transition: "background 0.22s ease, border-color 0.22s ease",
      }}
    >
      {children}
    </motion.button>
  );
}

/* ── Component ─────────────────────────────────────────────────────── */

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
          borderRadius: "12px",
          padding: "6px 8px 6px 12px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "var(--drag-shadow)",
          transition: "background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease",
        }}
      >
        <TrackpadIcon />

        <span style={{
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--drag-text)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          letterSpacing: "-0.01em",
          userSelect: "none",
          transition: "color 0.22s ease",
        }}>
          Drag or use
        </span>

        <div style={{ display: "flex", gap: "4px" }}>
          <ArrowBtn onClick={onNext}><ChevronUp /></ArrowBtn>
          <ArrowBtn onClick={onPrev}><ChevronDown /></ArrowBtn>
        </div>
      </div>
    </motion.div>
  );
}
