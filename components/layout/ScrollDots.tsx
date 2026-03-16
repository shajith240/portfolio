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
  // When open: float 8px outside sidebar right edge (20 + 360 + 8 = 388px)
  // When closed: sit 8px from the left edge of the screen
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
        backgroundColor: "#0D0D0D",
        border: "1px solid #2a2a2a",
        borderRadius: "20px",
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
              backgroundColor: isActive ? "#FF4500" : "#333333",
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
