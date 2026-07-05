"use client";

import { motion } from "framer-motion";
import { WALLPAPERS } from "@/lib/useWallpaper";

interface WallpaperPickerProps {
  current: string | null;
  onSelect: (filename: string) => void;
  onClose: () => void;
}

/* Lightweight glass popover — real macOS's own wallpaper picker is a
   System Settings pane, not a Finder window, so this doesn't need
   window chrome. Centered on screen, dismissible by backdrop click. */

export default function WallpaperPicker({ current, onSelect, onClose }: WallpaperPickerProps) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 599 }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 600,
          width: "min(480px, calc(100vw - 48px))",
          padding: "20px",
          borderRadius: "20px",
          background: "var(--glass-thick-bg)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(var(--glass-blur-thick)) saturate(var(--glass-saturate))",
          WebkitBackdropFilter: "blur(var(--glass-blur-thick)) saturate(var(--glass-saturate))",
          boxShadow: "0 30px 70px rgba(0, 0, 0, 0.45)",
        }}
      >
        <p style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
          Change Wallpaper
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
          }}
        >
          {WALLPAPERS.map((filename) => {
            const isSelected = filename === current;
            return (
              <button
                key={filename}
                onClick={() => onSelect(filename)}
                style={{
                  position: "relative",
                  aspectRatio: "16 / 10",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: isSelected ? "2px solid #0a84ff" : "1px solid var(--glass-border)",
                  padding: 0,
                  cursor: "pointer",
                  background: `url(/wallpapers/${filename}) center / cover no-repeat`,
                }}
                title={filename}
              />
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
