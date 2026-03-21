"use client";

import { motion } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";

interface ScrollDotsProps {
  count: number;
  activeIndex: number;
  onDotClick?: (index: number) => void;
  ml: number;
}

export default function ScrollDots({ count, activeIndex, onDotClick }: ScrollDotsProps) {
  const { isSidebarOpen } = useLayout();
  const leftPos = isSidebarOpen ? 388 : 8;

  return (
    <motion.div
      animate={{ left: `${leftPos}px` }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        position: "fixed",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        alignItems: "center",
        padding: "12px 6px",
        backgroundColor: "var(--dots-bg)",
        border: "1px solid var(--dots-border)",
        borderRadius: "20px",
        transition: "background-color 0.22s ease, border-color 0.22s ease",
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={i}
            onClick={() => onDotClick?.(i)}
            style={{
              width: "4px",
              height: isActive ? "20px" : "4px",
              borderRadius: "3px",
              backgroundColor: isActive ? "var(--dot-active)" : "var(--dot-inactive)",
              border: "none",
              padding: 0,
              cursor: "pointer",
              transition: "background-color 150ms ease, height 150ms ease",
            }}
          />
        );
      })}
    </motion.div>
  );
}
