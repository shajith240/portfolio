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
        // Opacity-only entrance, deliberately: animating scale/y on a
        // panel that carries backdrop-filter forces the browser to
        // re-run the blur over a moving region every frame — that was
        // the visible lag when opening this picker. Opacity
        // composites; the blur renders once.
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: [0, 0, 0.58, 1] }}
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
          backdropFilter: "blur(30px) saturate(var(--glass-saturate))",
          WebkitBackdropFilter: "blur(30px) saturate(var(--glass-saturate))",
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
                  background: "#1c1c1e",
                }}
                title={filename}
              >
                {/* <img> instead of a CSS background so the browser
                    can decode off the main thread (decoding=async) —
                    six multi-MB wallpapers decoding synchronously
                    during the open animation was the other half of
                    the lag. */}
                <img
                  src={`/wallpapers/${filename}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              </button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
